import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    include: ["monaco-editor/esm/vs/editor/editor.worker"],
  },
});
