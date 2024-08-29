import * as monaco from "monaco-editor-core";
import { type IColorTheme, TMToMonacoToken } from "../textmate/tm-to-monaco-token";
import DisposableList from "../utils/disposableList";

const tokenMapping = {
  namespace: "entity.name.namespace",
  type: "entity.name.type",
  "type.defaultLibrary": "support.type",
  struct: "storage.type.struct",
  class: "entity.name.type.class",
  "class.defaultLibrary": "support.class",
  interface: "entity.name.type.interface",
  enum: "entity.name.type.enum",
  function: "entity.name.function",
  "function.defaultLibrary": "support.function",
  method: "entity.name.function.member",
  macro: "entity.name.function.macro",
  variable: "variable.other.readwrite, entity.name.variable",
  "variable.readonly": "variable.other.constant",
  "variable.readonly.defaultLibrary": "support.constant",
  parameter: "variable.parameter",
  property: "variable.other.property",
  "property.readonly": "variable.other.constant.property",
  enumMember: "variable.other.enummember",
  event: "variable.other.event",
};

export class SemanticTokensCache {
  constructor(
    editor?: monaco.editor.IEditor | undefined,
    semanticTokenToTmMap: Record<string, string> = {}
  ) {
    this.semanticTokenToTmMap = { ...semanticTokenToTmMap, ...tokenMapping };
    if (editor) {
      this.registerEditor(editor);
    } else {
      const maybeEditor = monaco.editor.getEditors()[0];
      if (maybeEditor) {
        this.registerEditor(maybeEditor as monaco.editor.IStandaloneCodeEditor);
        return;
      } else {
        this.editorDisposables.push(
          monaco.editor.onDidCreateEditor((editor) => this.registerEditor(editor))
        );
      }
    }
  }

  semanticTokenToTmMap: Record<string, string>;
  semanticTokenToMonacoMap: Record<string, string> = { ...tokenMapping };

  themeService:
    | {
        _theme: IStandaloneTheme;
        onDidColorThemeChange: (callback: (theme: IStandaloneTheme) => void) => monaco.IDisposable;
      }
    | undefined;

  editorDisposables: DisposableList = new DisposableList();

  registerEditor(editor: monaco.editor.IEditor) {
    this.editorDisposables.dispose();
    this.themeService = (<any>editor)._themeService;
    const rules: monaco.editor.ITokenThemeRule[] = this.themeService!._theme.themeData.rules;

    let colorTheme: IColorTheme = {
      tokenColors: rules.map((rule) => ({
        scope: rule.token,
        settings: {
          foreground: rule.foreground,
          background: rule.background,
          fontStyle: rule.fontStyle,
        },
      })),
    };

    for (const key in this.semanticTokenToTmMap) {
      this.semanticTokenToMonacoMap[key] = TMToMonacoToken(colorTheme, [
        this.semanticTokenToTmMap[key],
      ]);
    }

    this.editorDisposables.push(
      this.themeService?.onDidColorThemeChange((theme) => {
        const rules: monaco.editor.ITokenThemeRule[] = theme.themeData.rules;

        colorTheme = {
          tokenColors: rules.map((rule) => ({
            scope: rule.token,
            settings: {
              foreground: rule.foreground,
              background: rule.background,
              fontStyle: rule.fontStyle,
            },
          })),
        };

        for (const key in this.semanticTokenToTmMap) {
          this.semanticTokenToMonacoMap[key] = TMToMonacoToken(colorTheme, [
            this.semanticTokenToTmMap[key],
          ]);
        }
      })
    );
  }

  registerSemanticTokenProvider(provider: monaco.languages.DocumentSemanticTokensProvider) {
    return {
      getLegend: () => {},
    };
  }
}

interface IStandaloneTheme {
  themeData: monaco.editor.IStandaloneThemeData;
}

const y = 1;
