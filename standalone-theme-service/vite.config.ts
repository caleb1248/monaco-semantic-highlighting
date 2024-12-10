import { defineConfig } from "vite";
export default defineConfig({
  optimizeDeps: {
    include: [
      "src/typescript-language-features/ts.worker",
      "monaco-editor-core/esm/vs/editor/editor.worker",
    ],
  },
});
