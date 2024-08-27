import editorWorker from "monaco-editor-core/esm/vs/editor/editor.worker?worker";
import tsWorker from "./typescript-language-features/ts.worker?worker";

self.MonacoEnvironment = {
  getWorker: function (_: string, label: string) {
    switch (label) {
      // case 'json':
      //   return new jsonWorker();
      // case 'css':
      // case 'scss':
      // case 'less':
      //   return new cssWorker();
      // case 'html':
      // case 'handlebars':
      // case 'razor':
      //   return new htmlWorker();
      case "typescript":
      case "javascript":
        return new tsWorker();
      default:
        return new editorWorker();
    }
  },
};
