import { languages } from "monaco-editor-core";
import { conf } from "./configuration";
languages.register({
  id: "typescript",
  extensions: [".ts", ".tsx", ".cts", ".mts"],
  aliases: ["TypeScript", "ts", "typescript"],
  mimetypes: ["text/typescript"],
});

languages.setLanguageConfiguration("typescript", conf);
