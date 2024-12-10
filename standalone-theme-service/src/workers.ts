import editorWorker from "monaco-editor-core/esm/vs/editor/editor.worker?worker";
import tsWorker from "./typescript-language-features/ts.worker?worker";

globalThis._VSCODE_FILE_ROOT =
  location.protocol + "//" + location.host + "/node_modules/monaco-editor-core/esm/";

globalThis.MonacoEnvironment = {
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
