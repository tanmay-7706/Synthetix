"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { History, RotateCcw, X, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { FileData, Message } from "@/types/workspace";

interface VersionEntry {
  id: string;
  label: string;
  createdAt: string;
}

interface VersionHistoryProps {
  workspaceId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRestore: (fileData: FileData, messages: Message[]) => void;
}

export function VersionHistory({
  workspaceId,
  isOpen,
  onClose,
  onRestore,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !workspaceId) return;

    const fetchVersions = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/versions?workspaceId=${workspaceId}`
        );
        if (!res.ok) throw new Error("Failed to fetch versions");
        const data = await res.json();
        setVersions(data.versions ?? []);
      } catch {
        toast.error("Failed to load version history");
      } finally {
        setIsLoading(false);
      }
    };

    fetchVersions();
  }, [isOpen, workspaceId]);

  const handleRestore = async (versionId: string) => {
    if (restoringId || !workspaceId) return;
    setRestoringId(versionId);

    try {
      const res = await fetch("/api/versions/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId, workspaceId }),
      });

      if (!res.ok) throw new Error("Failed to restore version");

      const data = await res.json();
      onRestore(data.fileData, data.messages);
      toast.success("Version restored successfully");
      onClose();
    } catch {
      toast.error("Failed to restore version");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-16 bottom-0 z-50 w-80 border-l border-white/8 bg-[#0a0a0a] transition-transform duration-300 ease-out flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/15">
              <History className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <span className="text-sm font-medium text-white/80">
              Version History
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-md text-white/30 hover:bg-white/8 hover:text-white/60 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 [&::-webkit-scrollbar]:hidden">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-white/20" />
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/4">
                <Clock className="h-4 w-4 text-white/20" />
              </div>
              <p className="text-xs text-white/30">No versions yet</p>
              <p className="mt-1 text-[11px] text-white/15">
                Versions are saved automatically on each generation.
              </p>
            </div>
          ) : (
            <div className="relative space-y-0">
              {/* Vertical timeline line */}
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gradient-to-b from-blue-500/30 via-white/8 to-transparent" />

              {versions.map((version, idx) => {
                const isFirst = idx === 0;
                const isRestoring = restoringId === version.id;

                return (
                  <div
                    key={version.id}
                    className="group relative flex items-start gap-3 py-3"
                  >
                    {/* Timeline dot */}
                    <div className="relative z-10 mt-0.5 flex-shrink-0">
                      <div
                        className={cn(
                          "h-[18px] w-[18px] rounded-full border-2 flex items-center justify-center transition-colors",
                          isFirst
                            ? "border-blue-400 bg-blue-500/20"
                            : "border-white/15 bg-[#0a0a0a] group-hover:border-white/30"
                        )}
                      >
                        {isFirst && (
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {isFirst && (
                            <span className="mb-1 inline-block rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-medium text-blue-400">
                              CURRENT
                            </span>
                          )}
                          <p className="line-clamp-2 text-xs font-medium text-white/60 group-hover:text-white/80 transition-colors leading-relaxed">
                            {version.label}
                          </p>
                          <p className="mt-0.5 text-[10px] text-white/20">
                            {formatDistanceToNow(
                              new Date(version.createdAt),
                              { addSuffix: true }
                            )}
                          </p>
                        </div>

                        {/* Restore button — hidden for current version */}
                        {!isFirst && (
                          <button
                            onClick={() => handleRestore(version.id)}
                            disabled={!!restoringId}
                            className="mt-0.5 flex h-6 items-center gap-1 rounded-md border border-white/8 bg-white/4 px-2 text-[10px] font-medium text-white/40 opacity-0 group-hover:opacity-100 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white/70 disabled:opacity-40"
                          >
                            {isRestoring ? (
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            ) : (
                              <RotateCcw className="h-2.5 w-2.5" />
                            )}
                            Restore
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
