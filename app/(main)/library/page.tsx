"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Loader2, Trash2, Code2, Tag, Plus, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SandpackProvider, SandpackPreview } from "@codesandbox/sandpack-react";
import { dracula } from "@codesandbox/sandpack-themes";
import { BlueTitle } from "@/components/reusables";

interface Component {
  id: string;
  name: string;
  code: string;
  tags: string[];
  createdAt: string;
}

export default function LibraryPage() {
  const { isLoaded } = useUser();
  const [components, setComponents] = useState<Component[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    fetchComponents();
  }, [isLoaded]);

  const fetchComponents = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/components");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = (await res.json()) as { components: Component[] };
      setComponents(data.components);
    } catch {
      toast.error("Failed to load components");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/components?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setComponents((prev) => prev.filter((c) => c.id !== id));
      toast.success("Component deleted");
    } catch {
      toast.error("Failed to delete component");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard");
  };

  // Collect all unique tags
  const allTags = Array.from(new Set(components.flatMap((c) => c.tags)));

  // Filter by selected tag
  const filtered = selectedTag
    ? components.filter((c) => c.tags.includes(selectedTag))
    : components;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-6 w-6 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#0a0a0a] px-8 py-8">
      {/* Header */}
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white/90">
              <BlueTitle>Component Library</BlueTitle>
            </h1>
            <p className="mt-1 text-sm text-white/30">
              Your saved components — reuse across projects
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/6 bg-white/3 px-3 py-1.5 text-xs text-white/30">
            <PackageOpen className="h-3.5 w-3.5" />
            {components.length} component{components.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Tag filter bar */}
        {allTags.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-white/20" />
            <button
              onClick={() => setSelectedTag(null)}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                selectedTag === null
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  : "bg-white/4 text-white/30 border border-white/6 hover:border-white/12"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                  selectedTag === tag
                    ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                    : "bg-white/4 text-white/30 border border-white/6 hover:border-white/12"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/8 bg-white/2 px-8 py-20">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-white/6">
              <Plus className="h-6 w-6 text-blue-400/50" />
            </div>
            <p className="text-sm font-medium text-white/40">
              No components saved yet
            </p>
            <p className="mt-1 text-xs text-white/20">
              Save components from your workspace to reuse them across projects
            </p>
          </div>
        )}

        {/* Component grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((comp) => (
            <div
              key={comp.id}
              className="group relative overflow-hidden rounded-2xl border border-white/6 bg-[#111] transition-all hover:border-white/12 hover:shadow-xl hover:shadow-blue-500/5"
            >
              {/* Live mini-preview */}
              <div className="h-48 overflow-hidden border-b border-white/6 bg-white">
                <SandpackProvider
                  template="react"
                  theme={dracula}
                  files={{
                    "/App.js": { code: comp.code },
                  }}
                  options={{
                    externalResources: ["https://cdn.tailwindcss.com"],
                    recompileMode: "delayed",
                    recompileDelay: 300,
                  }}
                >
                  <SandpackPreview
                    showOpenInCodeSandbox={false}
                    showRefreshButton={false}
                    style={{ height: "192px" }}
                  />
                </SandpackProvider>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white/80 truncate">
                    {comp.name}
                  </h3>
                  <p className="text-[10px] text-white/15">
                    {new Date(comp.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Tags */}
                {comp.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {comp.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/25"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 flex-1 gap-1 text-[11px] border-white/8 bg-white/3 text-white/40 hover:border-white/15 hover:text-white/60"
                    onClick={() => handleCopyCode(comp.code)}
                  >
                    <Code2 className="h-3 w-3" />
                    Copy Code
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0 border-red-500/10 bg-red-500/5 text-red-400/40 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                    onClick={() => handleDelete(comp.id)}
                    disabled={deletingId === comp.id}
                  >
                    {deletingId === comp.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
