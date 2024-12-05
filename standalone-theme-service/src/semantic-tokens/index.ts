import { getTokenClassificationRegistry } from "../missing-monaco-editor-files/tokenClassificationRegistry";

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
