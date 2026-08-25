import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

// ─── 1-Click Deploy via Vercel REST API ───────────────────────────────────────

export async function POST(request: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    return Response.json(
      { message: "Deploy not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { files, dependencies, title } = body as {
    files: Record<string, { code: string }>;
    dependencies: Record<string, string>;
    title?: string;
  };

  if (!files || Object.keys(files).length === 0) {
    return Response.json({ message: "No files to deploy" }, { status: 400 });
  }

  try {
    // Build the Vercel deployment payload
    const projectName = title
      ? `synthetix-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)}`
      : `synthetix-app-${Date.now()}`;

    const packageJson = {
      name: projectName,
      version: "1.0.0",
      private: true,
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
        "react-scripts": "5.0.1",
        ...dependencies,
      },
      scripts: {
        start: "react-scripts start",
        build: "react-scripts build",
      },
      browserslist: {
        production: [">0.2%", "not dead", "not op_mini all"],
        development: ["last 1 chrome version"],
      },
    };

    const deployFiles: { file: string; data: string }[] = [];

    // package.json
    deployFiles.push({
      file: "package.json",
      data: JSON.stringify(packageJson, null, 2),
    });

    // public/index.html
    deployFiles.push({
      file: "public/index.html",
      data: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title ?? "Synthetix App"}</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`,
    });

    // src/index.js
    deployFiles.push({
      file: "src/index.js",
      data: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);`,
    });

    // All generated files
    for (const [filePath, { code }] of Object.entries(files)) {
      const cleanPath = filePath.startsWith("/")
        ? `src${filePath}`
        : `src/${filePath}`;
      deployFiles.push({ file: cleanPath, data: code });
    }

    // Deploy via Vercel API
    const vercelRes = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: projectName,
        files: deployFiles.map((f) => ({
          file: f.file,
          data: f.data,
        })),
        projectSettings: {
          framework: "create-react-app",
          buildCommand: "npm run build",
          outputDirectory: "build",
        },
      }),
    });

    if (!vercelRes.ok) {
      const errData = await vercelRes.json().catch(() => ({}));
      console.error("[deploy] Vercel API error:", errData);
      return Response.json(
        {
          message:
            (errData as { error?: { message?: string } }).error?.message ??
            "Deploy failed",
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
