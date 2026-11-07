import { describe, it, expect } from "vitest";
import {
  extractJsonSubstring,
  escapeControlCharsInStrings,
  extractAiJsonFields,
  safeParseAiJson,
} from "@/lib/json-recovery";

describe("JSON Recovery Pipeline", () => {
  it("parses valid JSON unchanged", () => {
    const valid = JSON.stringify({
      assistantMessage: "App created successfully",
      title: "Counter App",
      files: {
        "/src/App.tsx": { code: "export default () => <button>Click</button>;" },
      },
      dependencies: { "lucide-react": "^0.344.0" },
    });

    const parsed = safeParseAiJson<{
      assistantMessage: string;
      title: string;
      files: Record<string, { code: string }>;
      dependencies: Record<string, string>;
    }>(valid);

    expect(parsed.title).toBe("Counter App");
    expect(parsed.assistantMessage).toBe("App created successfully");
    expect(parsed.files["/src/App.tsx"].code).toBe(
      "export default () => <button>Click</button>;"
    );
    expect(parsed.dependencies["lucide-react"]).toBe("^0.344.0");
  });

  it("parses JSON wrapped in Markdown fences", () => {
    const fenced = `\`\`\`json
{
  "assistantMessage": "Fenced message",
  "title": "Fenced Project",
  "files": {
    "/src/App.tsx": { "code": "export default () => <div>Hello Fences</div>;" }
  },
  "dependencies": {}
}
\`\`\``;

    const parsed = safeParseAiJson<{
      assistantMessage: string;
      title: string;
      files: Record<string, { code: string }>;
    }>(fenced);

    expect(parsed.title).toBe("Fenced Project");
    expect(parsed.assistantMessage).toBe("Fenced message");
    expect(parsed.files["/src/App.tsx"].code).toBe(
      "export default () => <div>Hello Fences</div>;"
    );
  });

  it("parses JSON wrapped in conversational prose and fences", () => {
    const wrapped = `Certainly! Here is your requested application:
\`\`\`
{
  "assistantMessage": "Here is your app",
  "title": "Prose Wrapped App",
  "files": {
    "/src/App.tsx": { "code": "console.log('hi');" }
  },
  "dependencies": {}
}
\`\`\`
I hope this meets all your requirements!`;

    const parsed = safeParseAiJson<{
      assistantMessage: string;
      title: string;
      files: Record<string, { code: string }>;
    }>(wrapped);

    expect(parsed.title).toBe("Prose Wrapped App");
    expect(parsed.files["/src/App.tsx"].code).toBe("console.log('hi');");
  });

  it("recovers and parses JSON with unescaped newlines inside string literals", () => {
    // Literal unescaped \n inside "code" string:
    const rawWithUnescapedNewlines = `{
  "assistantMessage": "Multiline code test",
  "title": "Multiline App",
  "files": {
    "/src/App.tsx": {
      "code": "export default function App() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}"
    }
  },
  "dependencies": {}
}`;

    // Confirm that standard JSON.parse fails on this raw input:
    expect(() => JSON.parse(rawWithUnescapedNewlines)).toThrowError(
      /control character/i
    );

    // Confirm that safeParseAiJson recovers it successfully:
    const parsed = safeParseAiJson<{
      assistantMessage: string;
      files: Record<string, { code: string }>;
    }>(rawWithUnescapedNewlines);

    expect(parsed.assistantMessage).toBe("Multiline code test");
    expect(parsed.files["/src/App.tsx"].code).toContain("const [count, setCount] = useState(0);");
  });

  it("recovers and parses JSON with raw tabs and carriage returns inside string literals", () => {
    const rawWithTabs = "{\n  \"assistantMessage\": \"Tab test\",\n  \"files\": {\n    \"/src/App.tsx\": {\n      \"code\": \"\tconst a = 1;\r\n\treturn a;\"\n    }\n  }\n}";

    // Standard JSON.parse throws on raw tabs / control characters in string literals
    expect(() => JSON.parse(rawWithTabs)).toThrow();

    const parsed = safeParseAiJson<{
      assistantMessage: string;
      files: Record<string, { code: string }>;
    }>(rawWithTabs);

    expect(parsed.assistantMessage).toBe("Tab test");
    expect(parsed.files["/src/App.tsx"].code).toContain("const a = 1;");
  });

  it("handles escaped quotes and backslashes properly without corrupting them", () => {
    const rawWithEscapes = `{
  "assistantMessage": "Quotes and backslashes",
  "files": {
    "/src/regex.ts": {
      "code": "const regex = /\\\\d+/;\\nconst str = \\"escaped string\\";\\n"
    }
  }
}`;

    const parsed = safeParseAiJson<{
      files: Record<string, { code: string }>;
    }>(rawWithEscapes);

    expect(parsed.files["/src/regex.ts"].code).toContain("const regex = /\\d+/;");
    expect(parsed.files["/src/regex.ts"].code).toContain('const str = "escaped string";');
  });

  it("safely throws on structurally invalid or truncated JSON", () => {
    const invalidJson = `{
  "assistantMessage": "Incomplete
  "files": {
    "/src/App.tsx": { "code": "truncated...`;

    expect(() => safeParseAiJson(invalidJson)).toThrow();
  });

  it("safely throws on empty or whitespace strings", () => {
    expect(() => safeParseAiJson("")).toThrow();
    expect(() => safeParseAiJson("   \n\t  ")).toThrow();
  });

  it("extracts json substring from markdown fences directly", () => {
    const raw = "```json\n{\"test\": 1}\n```";
    expect(extractJsonSubstring(raw)).toBe("{\"test\": 1}");
  });

  it("escapes unescaped control characters in string literals directly", () => {
    const raw = "{\"code\": \"line1\nline2\"}";
    expect(escapeControlCharsInStrings(raw)).toBe("{\"code\": \"line1\\nline2\"}");
  });

  it("extracts fields when raw code contains unescaped JSX double quotes", () => {
    const rawWithJsxQuotes = `{
  "assistantMessage": "Built a button",
  "title": "Red Button App",
  "files": {
    "/App.js": {
      "code": "export default function App() {
  return <button className="px-4 py-2 bg-red-600 text-white">Click</button>;
}"
    }
  },
  "dependencies": {
    "lucide-react": "^0.344.0"
  }
}`;

    const parsed = extractAiJsonFields(rawWithJsxQuotes);
    expect(parsed.title).toBe("Red Button App");
    expect(parsed.files["/App.js"].code).toContain('className="px-4 py-2 bg-red-600 text-white"');
    expect(parsed.dependencies?.["lucide-react"]).toBe("^0.344.0");

    // Also verify that safeParseAiJson handles it via the fallback
    const recovered = safeParseAiJson<{
      title: string;
      files: Record<string, { code: string }>;
    }>(rawWithJsxQuotes);
    expect(recovered.title).toBe("Red Button App");
    expect(recovered.files["/App.js"].code).toContain("px-4 py-2 bg-red-600 text-white");
  });

  it("recovers a realistic multi-file Gemini-style response with mixed formatting", () => {
    const realisticGeminiPayload = `Here is the full source code for the requested application:

\`\`\`json
{
  "assistantMessage": "I have created an interactive Red Button counter component styled with Tailwind CSS.",
  "title": "Red Button Counter",
  "files": {
    "/src/App.tsx": {
      "code": "import React, { useState } from 'react';
import { RedButton } from './components/RedButton';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className=\\"min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-6\\">
      <h1 className=\\"text-2xl font-bold text-white mb-6\\">Synthetix Counter</h1>
      <RedButton count={count} onClick={() => setCount(c => c + 1)} />
    </div>
  );
}"
    },
    "/src/components/RedButton.tsx": {
      "code": "import React from 'react';

interface RedButtonProps {
  count: number;
  onClick: () => void;
}

export function RedButton({ count, onClick }: RedButtonProps) {
  return (
    <button
      onClick={onClick}
      className=\\"px-6 py-3 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-semibold rounded-xl shadow-lg transition-all\\"
    >
      Clicks: {count}
    </button>
  );
}"
    }
  },
  "dependencies": {
    "lucide-react": "^0.344.0"
  }
}
\`\`\`

Let me know if you would like any additional styling!`;

    const parsed = safeParseAiJson<{
      assistantMessage: string;
      title: string;
      files: Record<string, { code: string }>;
      dependencies: Record<string, string>;
    }>(realisticGeminiPayload);

    expect(parsed.title).toBe("Red Button Counter");
    expect(Object.keys(parsed.files)).toEqual([
      "/src/App.tsx",
      "/src/components/RedButton.tsx",
    ]);
    expect(parsed.files["/src/App.tsx"].code).toContain("Synthetix Counter");
    expect(parsed.files["/src/components/RedButton.tsx"].code).toContain("RedButton");
    expect(parsed.dependencies["lucide-react"]).toBe("^0.344.0");
  });
});
