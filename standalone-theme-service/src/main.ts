import "./style.css";
import * as monaco from "monaco-editor-core";
import "./typescript-basics";
import { TokensProviderCache } from "./texmate";

monaco.editor.defineTheme("test-theme", await import("./test-theme.json"));

const cache = new TokensProviderCache();

const editor = monaco.editor.create(document.getElementById("app")!, {
  automaticLayout: true,
  theme: "test-theme",
});

const tokensProvider = await fetch("/TypeScript.tmLanguage.json")
  .then((resp) => resp.json())
  .then((json) => cache.addGrammar(json));

monaco.languages.setTokensProvider("typescript", tokensProvider);
editor.setModel(monaco.editor.createModel("", "typescript", monaco.Uri.file("main.ts")));
console.log(editor.getModel()?.getLanguageId());
