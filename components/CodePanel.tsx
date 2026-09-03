// CodePanel.tsx
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useRef, useState } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackFileExplorer,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { dracula } from "@codesandbox/sandpack-themes";
import {
  Eye,
  Code2,
  Download,
  AlertTriangle,
  Bot,
  Loader2,
  ArrowUp,
  Rocket,
  ExternalLink,
  Check,
  Copy,
  PackageOpen,
} from "lucide-react";
import { toast } from "sonner";
import { RingLoader } from "react-spinners";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PricingModal } from "@/components/PricingModal";
import { FrameworkModal } from "@/components/FrameworkModal";
import {
  type FrameworkConfig,
  DEFAULT_CONFIG,
  resolveConfig,
} from "@/lib/framework-configs";
import type { FileData, StatusStep } from "@/types/workspace";

// ─── Placeholder ──────────────────────────────────────────────────────────────

const PLACEHOLDER_FILES = {
  "/App.js": {
    code: `export default function App() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚡</div>
        <p style={{ fontSize: 14 }}>Your app will appear here</p>
      </div>
    </div>
  );
}`,
  },
};

// ─── Base dependencies ────────────────────────────────────────────────────────

const BASE_DEPENDENCIES: Record<string, string> = {
  "react-is": "latest",
  "react-router-dom": "latest",
  "lucide-react": "latest",
  recharts: "latest",
  "date-fns": "latest",
  "framer-motion": "latest",
  "react-hook-form": "latest",
  "@hookform/resolvers": "latest",
  zod: "latest",
  "@radix-ui/react-dialog": "latest",
  "@radix-ui/react-dropdown-menu": "latest",
  "@radix-ui/react-tabs": "latest",
  "@radix-ui/react-tooltip": "latest",
  "@radix-ui/react-accordion": "latest",
  "@radix-ui/react-select": "latest",
  axios: "latest",
  clsx: "latest",
  "class-variance-authority": "latest",
  "tailwind-merge": "latest",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveTab = "preview" | "code";

interface CodePanelProps {
  fileData: FileData | null;
  isGenerating: boolean;
  statusLog: StatusStep[];
  onImprove: (userRequest: string) => Promise<void>;
  onFixError: (error: string) => Promise<void>;
  onFilePatch: (patches: FileData) => void;
  appTitle: string | null;
  isImproving: boolean;
  isProUser: boolean;
}

// ─── SandpackInner ────────────────────────────────────────────────────────────
// Lives inside SandpackProvider so it can call useSandpack().
// Receives fileData as a prop and uses updateFile() to push code changes
// into the live Sandpack instance without remounting the provider.

function SandpackInner({
  isGenerating,
  statusLog,
  activeTab,
  setActiveTab,
  onImprove,
  onFixError,
  fileData,
  appTitle,
  isImproving,
  isProUser,
  frameworkConfig,
  onFrameworkChange,
}: {
  isGenerating: boolean;
  statusLog: StatusStep[];
  activeTab: ActiveTab;
  setActiveTab: (t: ActiveTab) => void;
  onImprove: (userRequest: string) => Promise<void>;
  onFixError: (error: string) => Promise<void>;
  fileData: FileData | null;
  appTitle: string | null;
  isImproving: boolean;
  isProUser: boolean;
  frameworkConfig: FrameworkConfig;
  onFrameworkChange: (config: FrameworkConfig) => void;
}) {
  const { sandpack, listen } = useSandpack();
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [improveInput, setImproveInput] = useState("");
  const [showImproveInput, setShowImproveInput] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ── Save to Library state ───────────────────────────────────────────────
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveTags, setSaveTags] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // ── Self-Healing state ────────────────────────────────────────────────────
  const [isHealing, setIsHealing] = useState(false);
  const [healCount, setHealCount] = useState(0);
  const healTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MAX_HEALS = 3;

  // Push file content updates into Sandpack without remounting.
  // This runs whenever fileData changes (e.g. after improve completes).
  // SandpackProvider key only changes when the file path set changes,
  // so this is the safe way to update existing file contents.
  const prevFilesRef = useRef<Record<string, { code: string }>>({});
  useEffect(() => {
    if (!fileData?.files) return;
    const prev = prevFilesRef.current;
    for (const [path, { code }] of Object.entries(fileData.files)) {
      if (prev[path]?.code !== code) {
        sandpack.updateFile(path, code);
      }
    }
    prevFilesRef.current = fileData.files;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileData?.files]);

  // Listen for Sandpack runtime errors
  useEffect(() => {
    unsubscribeRef.current = listen((msg) => {
      if (
        msg.type === "action" &&
        "action" in msg &&
        msg.action === "show-error"
      ) {
        const errMsg =
          "message" in msg && typeof msg.message === "string"
            ? msg.message
            : "An error occurred in the preview.";
        setPreviewError(errMsg);
        return;
      }
      if (msg.type === "compile") {
        const errMsg =
          "message" in msg && typeof msg.message === "string"
            ? msg.message
            : "Compile error in preview.";
        setPreviewError(errMsg);
        return;
      }
      if (msg.type === "success") {
        setPreviewError(null);
      }
    });
    return () => unsubscribeRef.current?.();
  }, [listen]);

  useEffect(() => {
    if (isGenerating) {
      setPreviewError(null);
      setHealCount(0);
    }
  }, [isGenerating]);

  // ── Auto-heal: debounce then silently fix ─────────────────────────────────
  useEffect(() => {
    if (!previewError || isGenerating || isImproving || isHealing) return;
    if (healCount >= MAX_HEALS) return; // stop after 3 attempts

    // Clear any pending timer
    if (healTimerRef.current) clearTimeout(healTimerRef.current);

    healTimerRef.current = setTimeout(async () => {
      const currentFiles = fileData?.files;
      if (!currentFiles) return;

      setIsHealing(true);
      setHealCount((c) => c + 1);

      try {
        const res = await fetch("/api/heal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: currentFiles, errorMessage: previewError }),
        });

        if (!res.ok || !res.body) throw new Error("Heal request failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6)) as {
                type: string;
                files?: Record<string, { code: string }>;
              };
              if (event.type === "healed" && event.files) {
                // Patch only the fixed files into Sandpack
                for (const [path, { code }] of Object.entries(event.files)) {
                  sandpack.updateFile(path, code);
                }
                setPreviewError(null);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      } catch (err) {
        console.warn("[self-heal] failed:", err);
      } finally {
        setIsHealing(false);
      }
    }, 1800); // 1.8s debounce — wait for error to settle

    return () => {
      if (healTimerRef.current) clearTimeout(healTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewError, isGenerating, isImproving]);

  const handleImproveSubmit = async () => {
    const trimmed = improveInput.trim();
    if (!trimmed || isImproving) return;
    setImproveInput("");
    setShowImproveInput(false);
    await onImprove(trimmed);
  };

  // ── Export to ZIP ──────────────────────────────────────────────────────────
  const handleExportZip = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const filesToZip =
        Object.keys(sandpack.files).length > 0
          ? sandpack.files
          : fileData?.files ?? {};

      const dependencies = {
        ...BASE_DEPENDENCIES,
        ...(fileData?.dependencies ?? {}),
      };

      const zip = new JSZip();

      const packageJson = {
        name: "synthetix-app",
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
      zip.file("package.json", JSON.stringify(packageJson, null, 2));

      zip.file(
        "public/index.html",
        `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Synthetix App</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`
      );

      for (const [filePath, fileObj] of Object.entries(filesToZip)) {
        const code =
          typeof fileObj === "object" && fileObj !== null && "code" in fileObj
            ? (fileObj as { code: string }).code
            : "";
        const zipPath = filePath.startsWith("/")
          ? `src${filePath}`
          : `src/${filePath}`;
        zip.file(zipPath, code);
      }

      zip.file(
        "src/index.js",
        `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);`
      );

      zip.file(
        "README.md",
        `# Synthetix App\n\nGenerated with [Synthetix](https://synthetix.app).\n\n## Getting started\n\n\`\`\`bash\nnpm install\nnpm start\n\`\`\``
      );

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const zipName = appTitle
        ? `${appTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")}.zip`
        : "synthetix-app.zip";
      a.download = zipName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const currentStepLabel =
    statusLog[statusLog.length - 1]?.label ?? "Generating…";

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as ActiveTab)}
      className="flex h-full flex-col gap-0"
    >
      {/* Tabs + Actions bar */}
      <div className="flex items-center justify-between border-b border-white/6 px-2">
        <TabsList
          variant="line"
          className="h-auto gap-0 rounded-none bg-transparent p-0"
        >
          <TabsTrigger className="border-b-2 pt-2" value="code">
            <Code2 className="h-3.5 w-3.5" />
            Code
          </TabsTrigger>
          <TabsTrigger className="border-b-2 pt-2" value="preview">
            <Eye className="h-3.5 w-3.5" />
            Preview
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-1.5">
          {/* ── Framework selector ── */}
          <FrameworkModal config={frameworkConfig} onChange={onFrameworkChange} />

          {/* ── Improve button ── */}
          {isProUser ? (
            showImproveInput ? (
              <div className="flex items-center gap-1.5">
                <div className="relative flex items-center">
                  <Bot className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-violet-400" />
                  <input
                    autoFocus
                    value={improveInput}
                    onChange={(e) => setImproveInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleImproveSubmit();
                      if (e.key === "Escape") setShowImproveInput(false);
                    }}
                    placeholder="What should I improve?"
                    className="h-7 w-56 rounded-md border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-cyan-500/10 pl-8 pr-3 text-xs text-white/80 placeholder:text-white/30 focus:border-violet-400/50 focus:outline-none focus:shadow-[0_0_10px_rgba(139,92,246,0.2)]"
                  />
                </div>
                <button
                  onClick={handleImproveSubmit}
                  disabled={!improveInput.trim() || isImproving}
                  className="group relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-md border border-violet-500/30 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-violet-300 transition-all duration-200 hover:border-violet-400/50 hover:from-violet-500/30 hover:to-fuchsia-500/30 hover:shadow-[0_0_10px_rgba(139,92,246,0.3)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isImproving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ArrowUp className="h-3 w-3" />
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowImproveInput(true)}
                disabled={isImproving || !fileData}
                className="group relative flex h-7 cursor-pointer items-center gap-1.5 overflow-hidden rounded-md border border-white/10 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-cyan-500/10 px-2.5 text-xs font-medium transition-all duration-300 hover:border-white/20 hover:from-violet-500/20 hover:via-fuchsia-500/20 hover:to-cyan-500/20 hover:shadow-[0_0_12px_rgba(139,92,246,0.3)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                {isImproving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
                ) : (
                  <Bot className="h-3.5 w-3.5 text-violet-400 transition-colors group-hover:text-violet-300" />
                )}
                <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                  {isImproving ? "Improving…" : "Improve with Agent"}
                </span>
                {!isImproving && (
                  <span className="rounded-sm bg-violet-500/30 px-1 py-0.5 text-[10px] font-semibold leading-none text-violet-300">
                    PRO
                  </span>
                )}
              </button>
            )
          ) : (
            <PricingModal reason="upgrade">
              <span className="group relative flex h-7 cursor-pointer items-center gap-1.5 overflow-hidden rounded-md border border-white/10 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-cyan-500/10 px-2.5 text-xs font-medium text-white/60 transition-all duration-300 hover:border-white/20 hover:from-violet-500/20 hover:via-fuchsia-500/20 hover:to-cyan-500/20 hover:text-white/90 hover:shadow-[0_0_12px_rgba(139,92,246,0.3)]">
                <span className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <Bot className="h-3.5 w-3.5 text-violet-400 transition-colors group-hover:text-violet-300" />
                <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                  Improve with Agent
                </span>
                <span className="rounded-sm bg-violet-500/30 px-1 py-0.5 text-[10px] font-semibold leading-none text-violet-300">
                  PRO
                </span>
              </span>
            </PricingModal>
          )}

          <Button
            variant="ghost"
            onClick={handleExportZip}
            disabled={isExporting || !fileData}
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Download
          </Button>

          {/* Deploy Live button */}
          <Button
            variant="ghost"
            onClick={async () => {
              if (isDeploying || !fileData) return;
              setIsDeploying(true);
              setDeployedUrl(null);
              try {
                const res = await fetch("/api/deploy", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    files: fileData.files,
                    dependencies: fileData.dependencies,
                    title: appTitle,
                  }),
                });
                if (!res.ok) {
                  const err = await res.json().catch(() => ({}));
                  throw new Error((err as { message?: string }).message ?? "Deploy failed");
                }
                const data = await res.json() as { url: string };
                setDeployedUrl(data.url);
              } catch (err) {
                console.error("Deploy failed:", err);
              } finally {
                setIsDeploying(false);
              }
            }}
            disabled={isDeploying || !fileData}
            className="gap-1.5"
          >
            {isDeploying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : deployedUrl ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Rocket className="h-3.5 w-3.5" />
            )}
            {isDeploying ? "Deploying…" : deployedUrl ? "Deployed" : "Deploy Live"}
          </Button>

          {/* Save to Library button */}
          <Button
            variant="ghost"
            onClick={() => {
              setSaveName(appTitle ?? "Component");
              setSaveTags("");
              setShowSaveModal(true);
            }}
            disabled={!fileData}
            className="gap-1.5"
          >
            <PackageOpen className="h-3.5 w-3.5" />
            Save
          </Button>
        </div>

        {/* Deployed URL banner */}
        {deployedUrl && (
          <div className="flex items-center gap-2 border-l-2 border-emerald-500/40 bg-emerald-500/5 px-3 py-1.5">
            <ExternalLink className="h-3 w-3 shrink-0 text-emerald-400/70" />
            <a
              href={deployedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-[11px] font-medium text-emerald-400/80 hover:text-emerald-300 transition-colors"
            >
              {deployedUrl}
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(deployedUrl);
                setCopiedUrl(true);
                setTimeout(() => setCopiedUrl(false), 2000);
              }}
              className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded text-white/30 hover:bg-white/8 hover:text-white/60 transition-colors"
            >
              {copiedUrl ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="relative flex-1 overflow-hidden h-full">
        {(isGenerating || isImproving) && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-[#0a0a0a]/90 backdrop-blur-sm">
            {/* Gradient glow ring */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-cyan-500/20 blur-xl animate-pulse" />
              <RingLoader color="#60a5fa" size={64} speedMultiplier={0.8} />
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-sm font-medium text-white/60">
                {isImproving ? "Improving with Cline AI…" : currentStepLabel}
              </p>
              <p className="text-xs text-white/20">
                This usually takes 10–20 seconds
              </p>
              {/* Animated dots */}
              <div className="mt-2 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-1 w-1 rounded-full bg-blue-400/40"
                    style={{
                      animation: `fadeInUp 0.6s ease-in-out ${i * 0.15}s infinite alternate`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <SandpackLayout
          style={{
            height: "100vh",
            border: "none",
            borderRadius: 0,
            background: "transparent",
          }}
        >
          <TabsContent
            value="preview"
            keepMounted
            className="mt-0 h-full w-full"
          >
            <SandpackPreview
              style={{ height: "89%" }}
              showOpenInCodeSandbox={false}
            />
          </TabsContent>

          <TabsContent
            value="code"
            keepMounted
            className="mt-0 flex h-full w-full"
          >
            <SandpackFileExplorer
              style={{
                height: "90%",
                width: "180px",
                borderRight: "0.5px solid rgba(255,255,255,0.08)",
              }}
            />
            <SandpackCodeEditor
              style={{ height: "90%", flex: 1 }}
              showTabs
              showLineNumbers
              showInlineErrors
              closableTabs
              readOnly
            />
          </TabsContent>
        </SandpackLayout>
      </div>

      {/* ── Self-healing toast ───────────────────────────────────────────── */}
      {isHealing && (
        <div className="absolute inset-x-0 bottom-0 z-30 flex items-center gap-2.5 border-t border-blue-500/20 bg-[#0a0f1a]/95 px-4 py-2.5 backdrop-blur-sm">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
          <p className="text-xs font-medium text-blue-300/70">
            Auto-fixing error… <span className="text-white/25">({healCount}/{MAX_HEALS})</span>
          </p>
          <div className="ml-auto flex h-5 items-center rounded-full bg-blue-500/10 px-2">
            <span className="text-[10px] font-semibold text-blue-400/60">SELF-HEALING</span>
          </div>
        </div>
      )}

      {/* Preview error banner — uses onFixError (Gemini), not onImprove (Cline) */}
      {previewError &&
        !isGenerating &&
        !isImproving &&
        !isHealing &&
        activeTab === "preview" && (
          <div className="absolute inset-x-0 -bottom-3 z-20 border-t border-red-500/20 bg-red-950/99 p-4 pb-6">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400/70" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-red-400/80">
                  {healCount >= MAX_HEALS
                    ? `Auto-fix failed after ${MAX_HEALS} attempts`
                    : "Preview error"}
                </p>
                <p className="break-all text-[11px] text-red-300/50">
                  {previewError}
                </p>
              </div>
              <Button
                onClick={() => onFixError(previewError)}
                variant="destructive"
              >
                <Bot className="h-3 w-3" />
                Fix with AI
              </Button>
            </div>
          </div>
        )}

      {/* Save to Library modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/8 bg-[#111] p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-white/80 mb-4">
              Save to Library
            </h3>
            <div className="mb-3">
              <label className="text-[11px] font-medium text-white/30 mb-1 block">Name</label>
              <input
                autoFocus
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="w-full rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-xs text-white/80 placeholder:text-white/20 focus:border-blue-500/30 focus:outline-none"
                placeholder="Component name"
              />
            </div>
            <div className="mb-5">
              <label className="text-[11px] font-medium text-white/30 mb-1 block">Tags (comma separated)</label>
              <input
                value={saveTags}
                onChange={(e) => setSaveTags(e.target.value)}
                className="w-full rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-xs text-white/80 placeholder:text-white/20 focus:border-blue-500/30 focus:outline-none"
                placeholder="e.g. button, form, layout"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 rounded-xl border border-white/8 bg-white/4 py-2 text-xs font-medium text-white/40 hover:bg-white/8 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!saveName.trim() || !fileData) return;
                  setIsSaving(true);
                  try {
                    // Combine all file codes into one string
                    const allCode = Object.entries(fileData.files)
                      .map(([path, f]) => `// ${path}\n${f.code}`)
                      .join("\n\n");
                    const tags = saveTags.split(",").map((t) => t.trim()).filter(Boolean);
                    const res = await fetch("/api/components", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name: saveName.trim(), code: allCode, tags }),
                    });
                    if (!res.ok) throw new Error("Save failed");
                    toast.success("Saved to library!");
                    setShowSaveModal(false);
                  } catch {
                    toast.error("Failed to save component");
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={!saveName.trim() || isSaving}
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-2 text-xs font-semibold text-white transition-all hover:from-blue-500 hover:to-violet-500 disabled:opacity-40"
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Tabs>
  );
}

// ─── CodePanel (outer) ────────────────────────────────────────────────────────

export function CodePanel({
  fileData,
  isGenerating,
  statusLog,
  onImprove,
  onFixError,
  onFilePatch: _onFilePatch,
  appTitle,
  isImproving,
  isProUser,
}: CodePanelProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("preview");
  const [frameworkConfig, setFrameworkConfig] = useState<FrameworkConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    if (fileData) setActiveTab("preview");
  }, [fileData]);

  const resolved = resolveConfig(frameworkConfig);

  const files = fileData?.files ?? PLACEHOLDER_FILES;
  const dependencies = {
    ...BASE_DEPENDENCIES,
    ...resolved.extraDependencies,
    ...(fileData?.dependencies ?? {}),
  };

  // Key only on file path set — NOT on file contents.
  // Content changes go through sandpack.updateFile() inside SandpackInner.
  // This prevents Sandpack from remounting when only code changes.
  const filePathKey = Object.keys(files).sort().join("|") + `|${frameworkConfig.framework}|${frameworkConfig.uiLib}`;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <SandpackProvider
        key={filePathKey}
        template={resolved.template}
        theme={dracula}
        files={files}
        customSetup={{ dependencies }}
        options={{
          externalResources: resolved.externalResources.length > 0
            ? resolved.externalResources
            : undefined,
          recompileMode: "delayed",
          recompileDelay: 500,
        }}
      >
        <SandpackInner
          isGenerating={isGenerating}
          statusLog={statusLog}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onImprove={onImprove}
          onFixError={onFixError}
          fileData={fileData}
          appTitle={appTitle}
          isImproving={isImproving}
          isProUser={isProUser}
          frameworkConfig={frameworkConfig}
          onFrameworkChange={setFrameworkConfig}
        />
      </SandpackProvider>
    </div>
  );
}
