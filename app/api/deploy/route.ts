import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { deployLimiter } from "@/lib/arcjet";
import { db } from "@/lib/prisma";
import { buildProjectBundle } from "@/lib/project-export";
import type { FrameworkKey, UILibKey } from "@/lib/framework-configs";

// ─── 1-Click Deploy via Vercel REST API ───────────────────────────────────────

export async function POST(request: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting check
  const decision = await deployLimiter.protect(request, {
    requested: 1,
    userId: clerkId,
  });
  if (decision.isDenied()) {
    return Response.json(
      {
        message:
          "Too many deploy requests. Please wait a minute before deploying again.",
      },
      { status: 429 }
    );
  }

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, plan: true },
  });
  if (!user) {
    return Response.json(
      { message: "User account not found" },
      { status: 404 }
    );
  }

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    return Response.json(
      { message: "Deploy not configured on server (missing VERCEL_TOKEN)" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { files, dependencies, title, framework, uiLib } = body as {
    files: Record<string, { code: string } | string>;
    dependencies?: Record<string, string>;
    title?: string;
    framework?: FrameworkKey;
    uiLib?: UILibKey;
  };

  if (!files || Object.keys(files).length === 0) {
    return Response.json({ message: "No files to deploy" }, { status: 400 });
  }

  try {
    const bundle = buildProjectBundle({
      framework: framework ?? "cra",
      uiLib,
      files,
      dependencies,
      title,
    });

    const projectName = title
      ? `synthetix-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)}`
      : `synthetix-app-${Date.now()}`;

    // Deploy via Vercel REST API
    const vercelRes = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: projectName,
        files: bundle.files.map((f) => ({
          file: f.path,
          data: f.content,
        })),
        projectSettings: bundle.projectSettings,
      }),
    });

    if (!vercelRes.ok) {
      const errData = await vercelRes.json().catch(() => ({}));
      console.error("[deploy] Vercel API error:", errData);
      return Response.json(
        {
          message:
            (errData as { error?: { message?: string } }).error?.message ??
            "Deployment failed with Vercel API",
        },
        { status: 502 }
      );
    }

    const deployment = (await vercelRes.json()) as {
      id: string;
      url: string;
      readyState: string;
    };

    return Response.json({
      url: `https://${deployment.url}`,
      id: deployment.id,
      status: deployment.readyState,
    });
  } catch (err) {
    console.error("[deploy] error:", err);
    return Response.json(
      { message: "Something went wrong during deployment" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;
