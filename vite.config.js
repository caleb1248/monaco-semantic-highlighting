import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    include: ["monaco-editor-core/esm/vs/editor/editor.worker"],
  },
});
