import { initialize } from "vscode/services";
import getThemeServiceOverride from "./theme-service-override";
import getEditorServiceOverride from "@codingame/monaco-vscode-editor-service-override";
import getMonarchServiceOverride from "@codingame/monaco-vscode-monarch-service-override";
import { editor } from "monaco-editor";
// import getThemeServiceOverride from "@codingame/monaco-vscode-theme-service-override";

// const themeServiceOverride = getThemeServiceOverride();

await initialize(
  {
    ...getThemeServiceOverride(),
    ...getMonarchServiceOverride(),
    // ...getEditorServiceOverride(async (model) => {
    //   const theEditor = editor.getEditors()[0];
    //   if (!theEditor) {
    //     console.warn("No editors were found.");
    //     return undefined;
    //   }
    //   theEditor.setModel(model.object.textEditorModel);
    //   return theEditor;
    // }),
  },
  document.getElementById("app")!
);
