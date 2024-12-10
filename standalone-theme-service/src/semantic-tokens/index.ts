import "./inspector";
import {
  getTokenClassificationRegistry,
  parseClassifierString,
  TokenStyleDefaults,
} from "monaco-editor-core/esm/vs/platform/theme/common/tokenClassificationRegistry";

import * as monaco from "monaco-editor-core";
import type { IColorTheme as ITextmateColorTheme } from "../texmate/TMHelper";
import { StandaloneServices } from "monaco-editor-core/esm/vs/editor/standalone/browser/standaloneServices";
import {
  IStandaloneThemeService,
  IStandaloneTheme,
} from "monaco-editor-core/esm/vs/editor/standalone/common/standaloneTheme";
import type { IColorTheme } from "monaco-editor-core/esm/vs/platform/theme/common/themeService";
import { reverseConvert } from "../texmate/theme-converter";
import { TMToMonacoToken } from "../texmate/tm-to-monaco-token";

const registry = getTokenClassificationRegistry();

/**
 * Contributes semantic token scope maps.
 */
export type SemanticTokenContributions = {
  /**
   * Lists the languge for which the defaults are.
   */
  language: string;
  /**
   * Maps a semantic token (described by semantic token selector) to one or more textMate scopes used to represent that token.
   */
  scopes: Record<string, string[]>;
}[];

export function addSemanticTokenContributions(contributions: SemanticTokenContributions) {
  for (const contribution of contributions) {
    const language = contribution.language;
    for (const selectorString in contribution.scopes) {
      registry.registerTokenStyleDefault(registry.parseTokenSelector(selectorString, language), {
        scopesToProbe: [contribution.scopes[selectorString]],
      });
    }
  }
}

let currentTheme: ITextmateColorTheme;

StandaloneServices.withServices(() => {
  const service = StandaloneServices.get(IStandaloneThemeService);
  const disposables: monaco.IDisposable[] = [];
  disposables.push(service.onDidColorThemeChange(setColorTheme.bind(this)));

  return {
    dispose: () => {
      for (const disposable of disposables) disposable.dispose();
    },
  };
});

function setColorTheme(colorTheme: IColorTheme) {
  const theme = colorTheme as IStandaloneTheme & {
    themeData: monaco.editor.IStandaloneThemeData;
  };
  const original = reverseConvert(theme.themeData);
  currentTheme = original;
}

export function convertToken(token: string, languageId: string): string {
  console.log("converting token...");
  const rules = registry.getTokenStylingDefaultRules();
  const { type, modifiers, language } = parseClassifierString(token, languageId);

  let bestMatch = -1;
  let bestDefaults: TokenStyleDefaults;

  for (const rule of rules) {
    const score = rule.selector.match(type, modifiers, language);
    if (score >= bestMatch) {
      bestMatch = score;
      bestDefaults = rule.defaults;
    }
  }

  // @ts-expect-error
  if (bestMatch < 0 || !bestDefaults) {
    console.warn("no match found for token", token);
    return "";
  }

  const scopesToProbe = bestDefaults.scopesToProbe?.flat();
  if (!scopesToProbe) return "";
  scopesToProbe.reverse();
  const result = TMToMonacoToken(currentTheme, scopesToProbe);
  console.log(token, "->", scopesToProbe, "->", result);
  return result;
}

export function createSemanticTokensProvider(
  language: string,
  provider: monaco.languages.DocumentSemanticTokensProvider
) {
  console.log("creating tokens provider...");
  const result: monaco.languages.DocumentSemanticTokensProvider = {
    getLegend() {
      console.log("obtaining legend");
      if (!currentTheme)
        setColorTheme(StandaloneServices.get(IStandaloneThemeService).getColorTheme());

      const originalLengend = provider.getLegend.call(provider);
      return {
        tokenTypes: originalLengend.tokenTypes.map((token) => convertToken(token, language)),
        tokenModifiers: originalLengend.tokenModifiers.map((token) =>
          convertToken(token, language)
        ),
      };
    },

    provideDocumentSemanticTokens(model, lastResultId, token) {
      return provider.provideDocumentSemanticTokens(model, lastResultId, token);
    },
    releaseDocumentSemanticTokens: provider.releaseDocumentSemanticTokens.bind(provider),
  };

  return result;
}
