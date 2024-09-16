import * as vsctm from "vscode-textmate";
import { loadWASM, OnigScanner, OnigString } from "vscode-oniguruma";
import * as monaco from "monaco-editor-core";
import wasmURL from "vscode-oniguruma/release/onig.wasm?url";
import { TMToMonacoToken } from "./tm-to-monaco-token";
import { reverseConvert } from "./theme-converter";
function overrideSetTheme() {
  const original = monaco.editor.defineTheme;
  monaco.editor.defineTheme = function (themeName, themeData) {
    const dataCopy: monaco.editor.IStandaloneThemeData = {
      base: themeData.base,
      inherit: themeData.inherit,
      colors: themeData.colors,
      rules: [...themeData.rules],
      encodedTokensColors: themeData.encodedTokensColors,
    };
    dataCopy.rules.push({
      token: "",
      foreground: themeData.colors["editor.foreground"],
      background: themeData.colors["editor.background"],
    });
    original(themeName, dataCopy);
  };
}

overrideSetTheme();

export { convertTheme, type IVScodeTheme, type TokenColor } from "./theme-converter";
const wasmPromise = fetch(wasmURL)
  .then((response) => response.arrayBuffer())
  .then((buffer) => loadWASM({ data: buffer }))
  .catch((error) => console.error("Failed to load `onig.wasm`:", error));

class TokensCache2 {
  private _cache: Record<string, monaco.languages.EncodedTokensProvider> = {};
  private _registry: vsctm.Registry;
  // @ts-expect-error _currentThemeData is definitely assigned in the constructor due to a call of the setTheme method
  private _currentThemeData: vsctm.IRawTheme;

  constructor(editor: monaco.editor.IEditor) {
    this._registry = new vsctm.Registry({
      onigLib: wasmPromise.then(() => {
        return {
          createOnigScanner: (sources) => new OnigScanner(sources),
          createOnigString: (str) => new OnigString(str),
        };
      }),
      loadGrammar: () => Promise.resolve(undefined),
    });
    console.log(this._registry);

    const themeService = (editor as unknown as { _themeService: any })._themeService;
    themeService.onDidColorThemeChange(this.setTheme.bind(this));
    this.setTheme(themeService._theme);
  }

  private setTheme(theme: any) {
    const colorTheme = reverseConvert(theme.themeData);
    this._registry.setTheme(colorTheme);
    this._currentThemeData = colorTheme;
  }

  addGrammar(grammar: string, type: "json" | "plist"): Promise<vsctm.IGrammar> {
    return this._registry.addGrammar(vsctm.parseRawGrammar(grammar, "grammar." + type));
  }

  public getTokensProvider(
    grammar: string | vsctm.IGrammar | Promise<vsctm.IGrammar>
  ): Promise<monaco.languages.EncodedTokensProvider> {
    if (typeof grammar === "string") {
      if (this._cache[grammar]) {
        return Promise.resolve(this._cache[grammar]);
      }
      return new Promise((resolve, reject) => {
        this._registry.loadGrammar(grammar).then((result) => {
          if (!result) {
            reject(new Error("Failed to load grammar with scope name '" + grammar + "'"));
            return;
          }
          this._cache[grammar] = this._grammarToTokensProvider(result);
          resolve(this._cache[grammar]);
        });
      });
    } else if (grammar instanceof Promise) {
      return grammar.then((result) => this._grammarToTokensProvider(result));
    } else {
      return Promise.resolve(this._grammarToTokensProvider(grammar));
    }
  }

  public getTokensProviderSync(
    grammar: string | vsctm.IGrammar
  ): monaco.languages.EncodedTokensProvider {
    if (typeof grammar === "string") {
      if (this._cache[grammar]) {
        return this._cache[grammar];
      }
      throw new Error("Grammar not found in cache");
    }
    return this._grammarToTokensProvider(grammar);
  }

  _grammarToTokensProvider(grammar: vsctm.IGrammar): monaco.languages.EncodedTokensProvider {
    return {
      getInitialState: () => vsctm.INITIAL,
      tokenizeEncoded(line, state: vsctm.StateStack): monaco.languages.IEncodedLineTokens {
        const lineTokens = grammar.tokenizeLine2(line, state);
        return {
          tokens: lineTokens.tokens,
          endState: lineTokens.ruleStack,
        };
      },
      tokenize: (line, state: vsctm.StateStack) => {
        console.log("tokenize unencoded requested");
        const theme = { tokenColors: this._currentThemeData.settings };
        const lineTokens = grammar.tokenizeLine(line, state);
        const tokens = lineTokens.tokens.map((token) => ({
          scopes: TMToMonacoToken(theme, token.scopes),
          startIndex: token.startIndex,
        }));
        return {
          tokens,
          endState: lineTokens.ruleStack,
        };
      },
    };
  }
}

export { TokensCache2 };
