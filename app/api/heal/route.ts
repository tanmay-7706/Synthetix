import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type { FileData } from "@/types/workspace";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

function sseEvent(type: string, payload: unknown): string {
  return `data: ${JSON.stringify({ type, ...(payload as object) })}\n\n`;
}

export async function POST(request: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as {
    files: FileData["files"];
    errorMessage: string;
  };

  const { files, errorMessage } = body;

  if (!files || !errorMessage) {
    return Response.json({ message: "Missing files or error" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (chunk: string) =>
        controller.enqueue(encoder.encode(chunk));

      try {
        enqueue(sseEvent("status", { message: "Analysing error…" }));

        const filesStr = Object.entries(files)
          .map(([path, f]) => `// ${path}\n${f.code}`)
          .join("\n\n---\n\n");

        const prompt = `You are a React debugging expert. The following React app throws a runtime error:

ERROR:
${errorMessage}

FILES:
${filesStr}

Your task:
1. Identify which file(s) caused the error.
2. Fix ONLY the broken file(s). Do NOT change working files unless necessary.
3. Respond with ONLY a valid JSON object (no markdown, no explanation) in this exact shape:
{
  "files": {
    "/BrokenFile.js": { "code": "<full fixed file content>" }
  }
}`;

        const result = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        });

        const raw = result.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        let parsed: { files: FileData["files"] };
        try {
          parsed = JSON.parse(raw) as { files: FileData["files"] };
        } catch {
          enqueue(sseEvent("error", { message: "Heal parse error" }));
          controller.close();
          return;
        }

        if (!parsed?.files || typeof parsed.files !== "object") {
          enqueue(sseEvent("error", { message: "Invalid heal response" }));
          controller.close();
          return;
        }

        enqueue(sseEvent("healed", { files: parsed.files }));
      } catch (err) {
        console.error("[heal] error:", err);
        enqueue(sseEvent("error", { message: "Heal failed" }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export const runtime = "nodejs";
export const maxDuration = 60;
