import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    include: ["typed-monaco-editor-core/esm/vs/editor/editor.worker"],
  },
});
