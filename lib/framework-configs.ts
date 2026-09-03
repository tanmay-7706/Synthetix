// Framework & UI Library configuration for Sandpack + Gemini prompt engineering

export type FrameworkKey = "cra" | "vite-react" | "vue";
export type UILibKey = "tailwind" | "shadcn" | "nextui" | "none";

export interface FrameworkConfig {
  framework: FrameworkKey;
  uiLib: UILibKey;
}

export interface ResolvedConfig {
  template: "react" | "vite-react" | "vue";
  extraDependencies: Record<string, string>;
  externalResources: string[];
  promptSuffix: string;
  entryFile: string;
}

const FRAMEWORK_LABELS: Record<FrameworkKey, string> = {
  cra: "Create React App",
  "vite-react": "Vite + React",
  vue: "Vue 3",
};

const UI_LABELS: Record<UILibKey, string> = {
  tailwind: "Tailwind CSS",
  shadcn: "Shadcn UI",
  nextui: "NextUI",
  none: "Vanilla CSS",
};

export { FRAMEWORK_LABELS, UI_LABELS };

export function resolveConfig(config: FrameworkConfig): ResolvedConfig {
  const { framework, uiLib } = config;

  // Template mapping
  const templateMap: Record<FrameworkKey, "react" | "vite-react" | "vue"> = {
    cra: "react",
    "vite-react": "vite-react",
    vue: "vue",
  };

  // Entry file per framework
  const entryMap: Record<FrameworkKey, string> = {
    cra: "/App.js",
    "vite-react": "/App.jsx",
    vue: "/src/App.vue",
  };

  // Base dependencies per UI lib
  const uiDeps: Record<UILibKey, Record<string, string>> = {
    tailwind: {},
    shadcn: {
      "class-variance-authority": "latest",
      clsx: "latest",
      "tailwind-merge": "latest",
      "@radix-ui/react-dialog": "latest",
      "@radix-ui/react-dropdown-menu": "latest",
      "@radix-ui/react-tabs": "latest",
      "@radix-ui/react-tooltip": "latest",
      "@radix-ui/react-select": "latest",
      "@radix-ui/react-accordion": "latest",
    },
    nextui: {
      "@nextui-org/react": "latest",
      "framer-motion": "latest",
    },
    none: {},
  };

  // External resources (CDNs)
  const resources: string[] = [];
  if (uiLib === "tailwind" || uiLib === "shadcn") {
    resources.push("https://cdn.tailwindcss.com");
  }

  // Prompt suffixes
  const frameworkPrompts: Record<FrameworkKey, string> = {
    cra: "Use React with functional components and hooks. The entry point is /App.js.",
    "vite-react":
      "Use React with Vite. The entry point is /App.jsx. Use ESM imports.",
    vue:
      "Use Vue 3 with the Composition API (<script setup>). The entry point is /src/App.vue. Use Single File Components (.vue). Do NOT use React.",
  };

  const uiPrompts: Record<UILibKey, string> = {
    tailwind: "Use Tailwind CSS utility classes for all styling.",
    shadcn:
      'Use Shadcn UI patterns: build components with Radix UI primitives + Tailwind CSS + CVA (class-variance-authority). Import utilities from a cn() helper. Do NOT import from "@/components/ui" paths — define components inline.',
    nextui:
      'Use NextUI components from "@nextui-org/react" for UI elements (Button, Card, Input, Modal, etc.). Wrap the app in NextUIProvider.',
    none: "Use plain CSS or inline styles for all styling. Do NOT use Tailwind.",
  };

  return {
    template: templateMap[framework],
    extraDependencies: uiDeps[uiLib],
    externalResources: resources,
    promptSuffix: `\n${frameworkPrompts[framework]}\n${uiPrompts[uiLib]}`,
    entryFile: entryMap[framework],
  };
}

export const DEFAULT_CONFIG: FrameworkConfig = {
  framework: "cra",
  uiLib: "tailwind",
};
