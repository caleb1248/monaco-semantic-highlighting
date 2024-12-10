import "./style.css";
import "./workers";
// import "./semantic-tokens/styling-override";
import * as monaco from "monaco-editor-core";
import "./typescript-basics";
import "./typescript-language-features/monaco.contribution";
import { TokensProviderCache } from "./texmate";

monaco.editor.defineTheme("test-theme", await import("./test-theme.json"));

const cache = new TokensProviderCache();

const editor = monaco.editor.create(document.getElementById("app")!, {
  automaticLayout: true,
  theme: "test-theme",
  "semanticHighlighting.enabled": true,
});

// globalThis.editor = editor;

const tokensProvider = await fetch("/TypeScript.tmLanguage.json")
  .then((resp) => resp.json())
  .then((json) => cache.addGrammar(json));

monaco.languages.setTokensProvider("typescript", tokensProvider);
editor.setModel(monaco.editor.createModel("", "typescript", monaco.Uri.file("main.ts")));
