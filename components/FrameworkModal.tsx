"use client";

import { useState } from "react";
import { Settings, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type FrameworkConfig,
  type FrameworkKey,
  type UILibKey,
  FRAMEWORK_LABELS,
  UI_LABELS,
  DEFAULT_CONFIG,
} from "@/lib/framework-configs";

interface FrameworkModalProps {
  config: FrameworkConfig;
  onChange: (config: FrameworkConfig) => void;
}

const FRAMEWORKS: { key: FrameworkKey; icon: string }[] = [
  { key: "cra", icon: "⚛️" },
  { key: "vite-react", icon: "⚡" },
  { key: "vue", icon: "💚" },
];

const UI_LIBS: { key: UILibKey; icon: string }[] = [
  { key: "tailwind", icon: "🌊" },
  { key: "shadcn", icon: "🧱" },
  { key: "nextui", icon: "🎨" },
  { key: "none", icon: "📝" },
];

export function FrameworkModal({ config, onChange }: FrameworkModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<FrameworkConfig>(config);

  const handleOpen = () => {
    setDraft(config);
    setIsOpen(true);
  };

  const handleSave = () => {
    onChange(draft);
    setIsOpen(false);
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        className="flex h-7 items-center gap-1.5 rounded-md border border-white/8 bg-white/4 px-2 text-[11px] font-medium text-white/40 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white/60"
        title="Framework & UI settings"
      >
        <Settings className="h-3 w-3" />
        {FRAMEWORK_LABELS[config.framework].split(" ")[0]}
      </button>

      {/* Modal backdrop + content */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="relative w-full max-w-md rounded-2xl border border-white/8 bg-[#111] p-6 shadow-2xl shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-white/20 hover:text-white/60 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-sm font-semibold text-white/80 mb-1">
              Framework & Design System
            </h3>
            <p className="text-[11px] text-white/25 mb-6">
              Configure what tech stack the AI should generate code with.
            </p>

            {/* Framework selection */}
            <div className="mb-5">
              <p className="text-[11px] font-medium text-white/40 mb-2.5 uppercase tracking-wider">
                Framework
              </p>
              <div className="grid grid-cols-3 gap-2">
                {FRAMEWORKS.map(({ key, icon }) => (
                  <button
                    key={key}
                    onClick={() => setDraft({ ...draft, framework: key })}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all",
                      draft.framework === key
                        ? "border-blue-500/40 bg-blue-500/10 shadow-lg shadow-blue-500/5"
                        : "border-white/6 bg-white/3 hover:border-white/12 hover:bg-white/5"
                    )}
                  >
                    <span className="text-xl">{icon}</span>
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        draft.framework === key
                          ? "text-blue-300"
                          : "text-white/40"
                      )}
                    >
                      {FRAMEWORK_LABELS[key]}
                    </span>
                    {draft.framework === key && (
                      <Check className="h-3 w-3 text-blue-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* UI Library selection */}
            <div className="mb-6">
              <p className="text-[11px] font-medium text-white/40 mb-2.5 uppercase tracking-wider">
                UI Library
              </p>
              <div className="grid grid-cols-2 gap-2">
                {UI_LIBS.map(({ key, icon }) => (
                  <button
                    key={key}
                    onClick={() => setDraft({ ...draft, uiLib: key })}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border p-3 transition-all",
                      draft.uiLib === key
                        ? "border-violet-500/40 bg-violet-500/10 shadow-lg shadow-violet-500/5"
                        : "border-white/6 bg-white/3 hover:border-white/12 hover:bg-white/5"
                    )}
                  >
                    <span className="text-lg">{icon}</span>
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        draft.uiLib === key
                          ? "text-violet-300"
                          : "text-white/40"
                      )}
                    >
                      {UI_LABELS[key]}
                    </span>
                    {draft.uiLib === key && (
                      <Check className="ml-auto h-3 w-3 text-violet-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-2.5 text-xs font-semibold text-white transition-all hover:from-blue-500 hover:to-violet-500 active:scale-[0.98]"
            >
              Apply Configuration
            </button>
          </div>
        </div>
      )}
    </>
  );
}
