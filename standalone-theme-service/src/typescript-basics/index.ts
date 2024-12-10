import { languages } from "monaco-editor-core";
import { addSemanticTokenContributions } from "../semantic-tokens";
import { conf } from "./configuration";
languages.register({
  id: "typescript",
  extensions: [".ts", ".tsx", ".cts", ".mts"],
  aliases: ["TypeScript", "ts", "typescript"],
  mimetypes: ["text/typescript"],
});

addSemanticTokenContributions([
  {
    language: "typescript",
    scopes: {
      property: ["variable.other.property.ts"],
      "property.readonly": ["variable.other.constant.property.ts"],
      variable: ["variable.other.readwrite.ts"],
      "variable.readonly": ["variable.other.constant.object.ts"],
      function: ["entity.name.function.ts"],
      namespace: ["entity.name.type.module.ts"],
      "variable.defaultLibrary": ["support.variable.ts"],
      "function.defaultLibrary": ["support.function.ts"],
    },
  },
]);

languages.setLanguageConfiguration("typescript", conf);
