import type { FrameworkKey, UILibKey } from "@/lib/framework-configs";

export interface ProjectBundleFile {
  path: string;
  content: string;
}

export interface ProjectBundle {
  files: ProjectBundleFile[];
  projectSettings: {
    framework: string;
    buildCommand: string;
    outputDirectory: string;
  };
}

export interface BuildProjectBundleOptions {
  framework?: FrameworkKey;
  uiLib?: UILibKey;
  files: Record<string, { code: string } | string>;
  dependencies?: Record<string, string>;
  title?: string;
}

export function buildProjectBundle({
  framework = "cra",
  files,
  dependencies = {},
  title,
}: BuildProjectBundleOptions): ProjectBundle {
  const cleanTitle = title?.trim() || "Synthetix App";
  const slug = cleanTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "synthetix-app";

  const fileEntries: ProjectBundleFile[] = [];

  // Helper to extract code string
  const getCode = (val: { code: string } | string): string => {
    if (typeof val === "string") return val;
    if (val && typeof val === "object" && "code" in val) return val.code;
    return "";
  };

  if (framework === "vite-react") {
    // ── Vite + React ──────────────────────────────────────────────────────────
    const packageJson = {
      name: slug,
      version: "1.0.0",
      private: true,
      type: "module",
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview",
      },
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
        ...dependencies,
      },
      devDependencies: {
        "@vitejs/plugin-react": "^4.2.1",
        vite: "^5.1.0",
      },
    };

    fileEntries.push({
      path: "package.json",
      content: JSON.stringify(packageJson, null, 2),
    });

    fileEntries.push({
      path: "vite.config.js",
      content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
});
`,
    });

    fileEntries.push({
      path: "index.html",
      content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${cleanTitle}</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
    });

    fileEntries.push({
      path: "src/main.jsx",
      content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
    });

    for (const [rawPath, val] of Object.entries(files)) {
      const code = getCode(val);
      let normalized = rawPath.startsWith("/") ? rawPath.slice(1) : rawPath;
      if (!normalized.startsWith("src/")) {
        normalized = `src/${normalized}`;
      }
      fileEntries.push({ path: normalized, content: code });
    }

    fileEntries.push({
      path: "README.md",
      content: `# ${cleanTitle}

Generated with [Synthetix](https://synthetix.app) using Vite + React.

## Getting started

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
    });

    return {
      files: fileEntries,
      projectSettings: {
        framework: "vite",
        buildCommand: "npm run build",
        outputDirectory: "dist",
      },
    };
  }

  if (framework === "vue") {
    // ── Vue 3 (Vite) ─────────────────────────────────────────────────────────
    const packageJson = {
      name: slug,
      version: "1.0.0",
      private: true,
      type: "module",
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview",
      },
      dependencies: {
        vue: "^3.4.0",
        ...dependencies,
      },
      devDependencies: {
        "@vitejs/plugin-vue": "^5.0.0",
        vite: "^5.1.0",
      },
    };

    fileEntries.push({
      path: "package.json",
      content: JSON.stringify(packageJson, null, 2),
    });

    fileEntries.push({
      path: "vite.config.js",
      content: `import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
});
`,
    });

    fileEntries.push({
      path: "index.html",
      content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${cleanTitle}</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`,
    });

    fileEntries.push({
      path: "src/main.js",
      content: `import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');
`,
    });

    for (const [rawPath, val] of Object.entries(files)) {
      const code = getCode(val);
      let normalized = rawPath.startsWith("/") ? rawPath.slice(1) : rawPath;
      if (!normalized.startsWith("src/")) {
        normalized = `src/${normalized}`;
      }
      fileEntries.push({ path: normalized, content: code });
    }

    fileEntries.push({
      path: "README.md",
      content: `# ${cleanTitle}

Generated with [Synthetix](https://synthetix.app) using Vue 3 + Vite.

## Getting started

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
    });

    return {
      files: fileEntries,
      projectSettings: {
        framework: "vite",
        buildCommand: "npm run build",
        outputDirectory: "dist",
      },
    };
  }

  // ── Create React App (Default fallback) ────────────────────────────────────
  const packageJson = {
    name: slug,
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

  fileEntries.push({
    path: "package.json",
    content: JSON.stringify(packageJson, null, 2),
  });

  fileEntries.push({
    path: "public/index.html",
    content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${cleanTitle}</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`,
  });

  fileEntries.push({
    path: "src/index.js",
    content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
`,
  });

  for (const [rawPath, val] of Object.entries(files)) {
    const code = getCode(val);
    let normalized = rawPath.startsWith("/") ? rawPath.slice(1) : rawPath;
    if (!normalized.startsWith("src/")) {
      normalized = `src/${normalized}`;
    }
    fileEntries.push({ path: normalized, content: code });
  }

  fileEntries.push({
    path: "README.md",
    content: `# ${cleanTitle}

Generated with [Synthetix](https://synthetix.app).

## Getting started

\`\`\`bash
npm install
npm start
\`\`\`
`,
  });

  return {
    files: fileEntries,
    projectSettings: {
      framework: "create-react-app",
      buildCommand: "npm run build",
      outputDirectory: "build",
    },
  };
}

