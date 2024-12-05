import * as vsctm from "vscode-textmate";
import { loadWASM, createOnigScanner, createOnigString } from "vscode-oniguruma";
import wasmURL from "vscode-oniguruma/release/onig.wasm?url";

import * as monaco from "monaco-editor-core";
import { StandaloneServices } from "monaco-editor-core/esm/vs/editor/standalone/browser/standaloneServices";
import {
  IStandaloneTheme,
  IStandaloneThemeService,
} from "monaco-editor-core/esm/vs/editor/standalone/common/standaloneTheme";
import { IColorTheme } from "monaco-editor-core/esm/vs/platform/theme/common/themeService";

import { TMToMonacoToken } from "./tm-to-monaco-token";
import { convertTheme, IVScodeTheme, reverseConvert } from "./theme-converter";
import { IColorTheme as ITextmateColorTheme } from "./TMHelper";

declare module "monaco-editor-core" {
  namespace editor {
    function defineTheme(themeName: string, themeData: IVScodeTheme): void;
  }
}

function overrideSetTheme() {
  const original = monaco.editor.defineTheme;
  monaco.editor.defineTheme = function (themeName, themeData) {
    original(themeName, "rules" in themeData ? themeData : convertTheme(themeData));
  };
}

overrideSetTheme();

export { convertTheme, type IVScodeTheme, type TokenColor } from "./theme-converter";
export { parseRawGrammar as parsePlistGrammar } from "vscode-textmate";

const wasmPromise = fetch(wasmURL)
  .then((response) => response.arrayBuffer())
  .then((buffer) => loadWASM({ data: buffer }))
  .catch((error) => console.error("Failed to load `onig.wasm`:", error));

export class TokensProviderCache implements monaco.IDisposable {
  private _cache: Record<string, monaco.languages.EncodedTokensProvider> = {};
  private _registry: vsctm.Registry;
  private _currentColorTheme: ITextmateColorTheme | undefined;

  constructor(
    grammarLoader: (
      scopeName: string
    ) => Promise<vsctm.IRawGrammar | null | undefined> = async () => null
  ) {
    this._registry = new vsctm.Registry({
      onigLib: wasmPromise.then(() => ({ createOnigScanner, createOnigString })),
      async loadGrammar(scopeName) {
        return grammarLoader(scopeName);
      },
    });

    StandaloneServices.withServices(() => {
      const service = StandaloneServices.get(IStandaloneThemeService);
      const disposables: monaco.IDisposable[] = [];
      disposables.push(service.onDidColorThemeChange(this._setColorTheme.bind(this)));

      return {
        dispose: () => {
          for (const disposable of disposables) disposable.dispose();
        },
      };
    });
  }
  /**
   * Creates a tokens provider from a raw grammar, caches the tokens provider and returns the provider.
   * @param grammar A raw grammar, either supplied as an object as a plist grammar parsed by `parseRawGrammar`
   * @returns A tokens provider
   */
  public async addGrammar(grammar: vsctm.IRawGrammar) {
    const loadedGrammar = await this._registry.addGrammar(grammar);
    const tokensProvider = this._createTokensProvider(loadedGrammar);
    this._cache[grammar.scopeName] = tokensProvider;
    return tokensProvider;
  }

  public async getTokensProvider(scopeNameOrGrammar: string) {
    const cacheResult = this._cache[scopeNameOrGrammar];
    if (cacheResult) return cacheResult;

    const loadedGrammar = this._registry.loadGrammar(scopeNameOrGrammar);
    if (!loadedGrammar)
      throw new Error(
        "Failed to load grammar with scope name of '" +
          scopeNameOrGrammar +
          "'. Please check your grammar fetcher supplied in the constructor arguments or use the addGrammar function to load grammars."
      );
  }

  private _createTokensProvider(grammar: vsctm.IGrammar): monaco.languages.EncodedTokensProvider {
    return {
      getInitialState: () => vsctm.INITIAL,
      tokenizeEncoded(line, state: vsctm.StateStack) {
        const result = grammar.tokenizeLine2(line, state);
        return {
          endState: result.ruleStack,
          tokens: result.tokens,
        };
      },

      tokenize: (line, state: vsctm.StateStack) => {
        const textmateResult = grammar.tokenizeLine(line, state);
        let tokens: monaco.languages.IToken[] = [];

        for (let i = 0, len = textmateResult.tokens.length; i < len; i++) {
          const token = textmateResult.tokens[i];
          tokens.push({
            startIndex: token.startIndex,
            scopes: TMToMonacoToken(this._currentColorTheme!, token.scopes),
          });
        }

        return {
          tokens,
          endState: textmateResult.ruleStack,
        };
      },
    };
  }

  private _setColorTheme(colorTheme: IColorTheme) {
    console.log(this);
    const theme = colorTheme as IStandaloneTheme & {
      themeData: monaco.editor.IStandaloneThemeData;
    };
    const original = reverseConvert(theme.themeData);
    const colorMap = theme.tokenTheme.getColorMap().map((color) => color.toString().toUpperCase());
    this._registry.setTheme({ settings: original.tokenColors }, colorMap);

    this._currentColorTheme = original;
  }

  public dispose(): void {}
}
