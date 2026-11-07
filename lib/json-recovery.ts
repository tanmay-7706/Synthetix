/**
 * Safe recovery parser for Gemini streaming JSON output.
 *
 * When LLMs generate large multi-file code responses inside JSON string literals,
 * they occasionally emit raw unescaped newlines/tabs, markdown code fences,
 * or raw unescaped quotes inside JSX attributes (e.g. className="w-full").
 *
 * This utility uses a progressive fallback pipeline:
 * 1. Strict JSON.parse (instant for valid JSON).
 * 2. Markdown fence stripping and outer brace extraction.
 * 3. In-string control-character escaping.
 * 4. Structural field and file extractor (for raw multiline code with JSX quotes).
 *
 * If all recovery attempts fail, it throws a SyntaxError so the caller
 * can return a clean, user-friendly error message.
 */

export interface ParsedAiResponse {
  assistantMessage: string;
  title?: string;
  files: Record<string, { code: string }>;
  dependencies?: Record<string, string>;
}

export function extractJsonSubstring(raw: string): string {
  let str = raw.trim();

  // Strip Markdown code fences if present (```json ... ``` or ``` ...)
  if (str.startsWith("```")) {
    str = str.replace(/^```(?:json|JSON)?\s*\n?/, "");
    str = str.replace(/\n?```\s*$/, "");
    str = str.trim();
  }

  // Extract from the first '{' to the last '}'
  const firstBrace = str.indexOf("{");
  const lastBrace = str.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    str = str.substring(firstBrace, lastBrace + 1);
  }

  return str;
}

export function escapeControlCharsInStrings(str: string): string {
  let inString = false;
  let escaped = false;
  let out = "";

  for (let i = 0; i < str.length; i++) {
    const c = str[i];

    if (escaped) {
      out += c;
      escaped = false;
      continue;
    }

    if (c === "\\") {
      escaped = true;
      out += c;
      continue;
    }

    if (c === '"') {
      inString = !inString;
      out += c;
      continue;
    }

    if (inString) {
      if (c === "\n") {
        out += "\\n";
        continue;
      }
      if (c === "\r") {
        out += "\\r";
        continue;
      }
      if (c === "\t") {
        out += "\\t";
        continue;
      }
      const code = c.charCodeAt(0);
      if (code < 32 || (code >= 127 && code <= 159)) {
        continue;
      }
    }

    out += c;
  }

  return out;
}

/**
 * Fallback structural extractor for cases where Gemini outputs raw code
 * containing unescaped double quotes inside JSX attributes (e.g. className="...")
 * that cannot be parsed by standard JSON.parse.
 */
export function extractAiJsonFields(raw: string): ParsedAiResponse {
  const trimmed = raw.trim();
  // Structurally malformed or truncated payloads missing closing delimiters must throw
  if (!trimmed.endsWith("}") && !trimmed.endsWith("```")) {
    throw new SyntaxError("Truncated JSON payload missing closing delimiter");
  }
  // Extract title
  const titleMatch = raw.match(/"title"\s*:\s*"([^"]+)"/);
  const title = titleMatch ? titleMatch[1] : undefined;

  // Extract assistantMessage
  const msgMatch = raw.match(/"assistantMessage"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const assistantMessage = msgMatch
    ? msgMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"')
    : "I have generated the requested application.";

  // Extract dependencies object
  const dependencies: Record<string, string> = {};
  const depsMatch = raw.match(/"dependencies"\s*:\s*\{([^}]*)\}/);
  if (depsMatch) {
    try {
      const parsedDeps = JSON.parse(`{${depsMatch[1]}}`) as Record<string, string>;
      Object.assign(dependencies, parsedDeps);
    } catch {
      const depPairs = depsMatch[1].matchAll(/"([^"]+)"\s*:\s*"([^"]+)"/g);
      for (const m of depPairs) {
        dependencies[m[1]] = m[2];
      }
    }
  }

  // Extract files
  const files: Record<string, { code: string }> = {};
  const fileRegex = /"(\/[^"]+)"\s*:\s*\{\s*"code"\s*:\s*"/g;
  let match: RegExpExecArray | null;
  const fileIndices: { path: string; codeStart: number }[] = [];

  while ((match = fileRegex.exec(raw)) !== null) {
    fileIndices.push({
      path: match[1],
      codeStart: match.index + match[0].length,
    });
  }

  if (fileIndices.length === 0) {
    throw new SyntaxError("No valid file definitions found in AI response");
  }

  for (let i = 0; i < fileIndices.length; i++) {
    const cur = fileIndices[i];
    const next = fileIndices[i + 1];
    let rawCode: string;

    if (next) {
      // Find the boundary between current file and next file
      // Look for the last closing quote before next.codeStart
      const segment = raw.slice(cur.codeStart, next.codeStart);
      const endMatch = segment.match(/"\s*\}\s*,\s*$/) || segment.match(/"\s*\}\s*,/);
      if (endMatch && endMatch.index !== undefined) {
        rawCode = segment.slice(0, endMatch.index);
      } else {
        rawCode = segment.replace(/"\s*\}\s*,\s*"[^"]+"\s*:\s*\{\s*"code"\s*:\s*"$/, "");
      }
    } else {
      // Last file ends before the closing of "files" and root object
      const segment = raw.slice(cur.codeStart);
      const endMatch = segment.match(/"\s*\}\s*\}\s*(?:,\s*"dependencies"|\})/);
      if (endMatch && endMatch.index !== undefined) {
        rawCode = segment.slice(0, endMatch.index);
      } else {
        const lastQuote = segment.lastIndexOf('"\n    }');
        if (lastQuote !== -1) {
          rawCode = segment.slice(0, lastQuote);
        } else {
          rawCode = segment.replace(/"\s*\}\s*\}\s*\}?\s*$/, "");
        }
      }
    }

    let code = rawCode;
    // Unescape quotes if they were escaped
    code = code.replace(/\\"/g, '"');
    // If it only has escaped newlines, unescape them
    if (code.includes("\\n") && !code.includes("\n")) {
      code = code.replace(/\\n/g, "\n");
    }

    files[cur.path] = { code: code.trim() };
  }

  return {
    assistantMessage,
    title,
    files,
    dependencies,
  };
}

/**
 * Attempts strict JSON.parse first. If strict parsing throws, applies the
 * safe recovery pipeline (fence stripping, brace extraction, control-character escaping,
 * and structural field extraction).
 *
 * If all recovery attempts fail, throws SyntaxError for the caller to handle gracefully.
 */
export function safeParseAiJson<T = ParsedAiResponse>(raw: string): T {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new SyntaxError("Unexpected end of JSON input");
  }

  // 1. Strict parse attempt
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Proceed to recovery pipeline
  }

  // 2. Extract JSON substring from markdown fences or prose
  const extracted = extractJsonSubstring(raw);
  try {
    return JSON.parse(extracted) as T;
  } catch {
    // Proceed to control character escape
  }

  // 3. Escape control characters inside string literals
  try {
    const sanitized = escapeControlCharsInStrings(extracted);
    return JSON.parse(sanitized) as T;
  } catch {
    // Proceed to structural extraction
  }

  // 4. Structural extraction fallback
  return extractAiJsonFields(raw) as unknown as T;
}
