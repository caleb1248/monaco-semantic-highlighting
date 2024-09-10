import * as vsctm from "vscode-textmate";
import { loadWASM, OnigScanner, OnigString } from "vscode-oniguruma";
import * as monaco from "monaco-editor-core";
import wasmURL from "vscode-oniguruma/release/onig.wasm?url";
import { IColorTheme, TMToMonacoToken } from "./tm-to-monaco-token";
import { reverseConvert } from "./theme-converter";

export { convertTheme, type IVScodeTheme, type TokenColor } from "./theme-converter";
const wasmPromise = fetch(wasmURL)
  .then((response) => response.arrayBuffer())
  .then((buffer) => loadWASM({ data: buffer }))
  .catch((error) => console.error("Failed to load `onig.wasm`:", error));

const scopeUrlMap: Record<string, string> = {
  "source.ts": "/TypeScript.tmLanguage.json",
};

const registry = new vsctm.Registry({
  onigLib: wasmPromise.then(() => {
    return {
      createOnigScanner: (sources) => new OnigScanner(sources),
      createOnigString: (str) => new OnigString(str),
    };
  }),
  loadGrammar(scopeName) {
    function fetchGrammar(path: string) {
      return fetch(path).then((response) => response.text());
    }

    const url = scopeUrlMap[scopeName];
    if (url) {
      return fetchGrammar(url).then((grammar) => JSON.parse(grammar));
    }

    return Promise.reject(new Error(`No grammar found for scope: ${scopeName}`));
  },
});

async function createTokensProvider(
  scopeName: string,
  editor?: (monaco.editor.IStandaloneCodeEditor & { _themeService?: any }) | undefined
): Promise<monaco.languages.TokensProvider> {
  let colorTheme: IColorTheme | undefined = undefined;

  if (editor) {
    const rules: monaco.editor.ITokenThemeRule[] = editor._themeService._theme.themeData.rules;
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

    // @ts-expect-error
    editor._themeService.onDidColorThemeChange((theme) => {
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
    });
  }

  const grammar = await registry.loadGrammar(scopeName);

  if (!grammar) {
    throw new Error("Failed to load grammar");
  }

  const result: monaco.languages.TokensProvider = {
    getInitialState() {
      return vsctm.INITIAL;
    },
    tokenize(line, state: vsctm.StateStack) {
      const lineTokens = grammar.tokenizeLine(line, state);
      const tokens: monaco.languages.IToken[] = [];
      for (const token of lineTokens.tokens) {
        tokens.push({
          startIndex: token.startIndex,
          // Monaco doesn't support an array of scopes
          scopes: colorTheme
            ? TMToMonacoToken(colorTheme, token.scopes)
            : token.scopes[token.scopes.length - 1],
        });
      }
      return { tokens, endState: lineTokens.ruleStack };
    },
  };

  return result;
}

class TokensProviderCache {
  private cache: Record<string, monaco.languages.TokensProvider> = {};

  constructor(private editor?: monaco.editor.IStandaloneCodeEditor | undefined) {}

  async getTokensProvider(scopeName: string): Promise<monaco.languages.TokensProvider> {
    if (!this.cache[scopeName]) {
      this.cache[scopeName] = await createTokensProvider(scopeName, this.editor);
    }

    return this.cache[scopeName];
  }
}

class TokensCache2 {
  private _cache: Record<string, monaco.languages.EncodedTokensProvider> = {};
  private _registry: vsctm.Registry;

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

    const themeService = (editor as unknown as { _themeService: any })._themeService;
    themeService.onDidColorThemeChange((theme: any) => {
      this._registry.setTheme(
        reverseConvert(theme.themeData),
        theme._tokenTheme._colorMap._id2color.map((color: any) => color.toString())
      );
    });
  }

  addGrammar(grammar: string, type: "json" | "plist"): Promise<vsctm.IGrammar> {
    return this._registry.addGrammar(vsctm.parseRawGrammar(grammar, "grammar." + type));
  }

  getTokensProvider(
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
    }
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
    };
  }
}

export { TokensProviderCache };
