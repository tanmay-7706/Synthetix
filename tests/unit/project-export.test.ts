import { describe, it, expect } from "vitest";
import { buildProjectBundle } from "@/lib/project-export";

describe("lib/project-export - buildProjectBundle", () => {
  const sampleFiles = {
    "App.jsx": "export default function App() { return <h1>Hello</h1>; }",
  };

  it("generates a valid Vite + React project bundle", () => {
    const bundle = buildProjectBundle({
      framework: "vite-react",
      files: sampleFiles,
      title: "My React Vite App",
    });

    expect(bundle.projectSettings).toEqual({
      framework: "vite",
      buildCommand: "npm run build",
      outputDirectory: "dist",
    });

    const fileMap = new Map(bundle.files.map((f) => [f.path, f.content]));

    // package.json checks
    expect(fileMap.has("package.json")).toBe(true);
    const pkg = JSON.parse(fileMap.get("package.json")!);
    expect(pkg.scripts.dev).toBe("vite");
    expect(pkg.scripts.build).toBe("vite build");
    expect(pkg.dependencies.react).toBeDefined();
    expect(pkg.devDependencies.vite).toBeDefined();
    expect(pkg.devDependencies["@vitejs/plugin-react"]).toBeDefined();

    // Config and entry files
    expect(fileMap.has("vite.config.js")).toBe(true);
    expect(fileMap.get("vite.config.js")).toContain("@vitejs/plugin-react");

    expect(fileMap.has("index.html")).toBe(true);
    expect(fileMap.get("index.html")).toContain('<script type="module" src="/src/main.jsx"></script>');

    expect(fileMap.has("src/main.jsx")).toBe(true);
    expect(fileMap.get("src/main.jsx")).toContain("ReactDOM.createRoot");

    // Transferred source files
    expect(fileMap.has("src/App.jsx")).toBe(true);
    expect(fileMap.get("src/App.jsx")).toBe(sampleFiles["App.jsx"]);
  });

  it("generates a valid Vue 3 (Vite) project bundle", () => {
    const vueFiles = {
      "App.vue": "<template><h1>Hello Vue</h1></template>",
    };

    const bundle = buildProjectBundle({
      framework: "vue",
      files: vueFiles,
      title: "My Vue App",
    });

    expect(bundle.projectSettings).toEqual({
      framework: "vite",
      buildCommand: "npm run build",
      outputDirectory: "dist",
    });

    const fileMap = new Map(bundle.files.map((f) => [f.path, f.content]));

    // package.json checks
    expect(fileMap.has("package.json")).toBe(true);
    const pkg = JSON.parse(fileMap.get("package.json")!);
    expect(pkg.scripts.dev).toBe("vite");
    expect(pkg.scripts.build).toBe("vite build");
    expect(pkg.dependencies.vue).toBeDefined();
    expect(pkg.devDependencies["@vitejs/plugin-vue"]).toBeDefined();

    // Config and entry files
    expect(fileMap.has("vite.config.js")).toBe(true);
    expect(fileMap.get("vite.config.js")).toContain("@vitejs/plugin-vue");

    expect(fileMap.has("index.html")).toBe(true);
    expect(fileMap.get("index.html")).toContain('<script type="module" src="/src/main.js"></script>');

    expect(fileMap.has("src/main.js")).toBe(true);
    expect(fileMap.get("src/main.js")).toContain("createApp(App).mount('#app')");

    // Source files
    expect(fileMap.has("src/App.vue")).toBe(true);
  });

  it("generates a valid Create React App (CRA) bundle", () => {
    const bundle = buildProjectBundle({
      framework: "cra",
      files: sampleFiles,
      title: "My CRA App",
    });

    expect(bundle.projectSettings).toEqual({
      framework: "create-react-app",
      buildCommand: "npm run build",
      outputDirectory: "build",
    });

    const fileMap = new Map(bundle.files.map((f) => [f.path, f.content]));

    // package.json checks
    expect(fileMap.has("package.json")).toBe(true);
    const pkg = JSON.parse(fileMap.get("package.json")!);
    expect(pkg.scripts.start).toBe("react-scripts start");
    expect(pkg.scripts.build).toBe("react-scripts build");
    expect(pkg.dependencies["react-scripts"]).toBe("5.0.1");

    // Public index and src entry
    expect(fileMap.has("public/index.html")).toBe(true);
    expect(fileMap.has("src/index.js")).toBe(true);
    expect(fileMap.get("src/index.js")).toContain("ReactDOM.createRoot");
    expect(fileMap.has("src/App.jsx")).toBe(true);
  });

  it("handles unsupported framework input by safely falling back to CRA", () => {
    const bundle = buildProjectBundle({
      framework: "unsupported-framework" as any,
      files: sampleFiles,
    });

    expect(bundle.projectSettings.framework).toBe("create-react-app");
    expect(bundle.projectSettings.outputDirectory).toBe("build");
    const fileMap = new Map(bundle.files.map((f) => [f.path, f.content]));
    expect(fileMap.has("public/index.html")).toBe(true);
  });

  it("handles empty or object-formatted code blocks correctly", () => {
    const bundle = buildProjectBundle({
      framework: "vite-react",
      files: {
        "Comp.jsx": { code: "export const Comp = () => <div>Ok</div>;" },
        "Empty.jsx": "" as any,
      },
    });

    const fileMap = new Map(bundle.files.map((f) => [f.path, f.content]));
    expect(fileMap.get("src/Comp.jsx")).toBe("export const Comp = () => <div>Ok</div>;");
    expect(fileMap.get("src/Empty.jsx")).toBe("");
  });
});
