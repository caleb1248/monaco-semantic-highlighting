import * as monaco from "monaco-editor-core";
import { getTokenClassificationRegistry } from "monaco-editor-core/esm/vs/platform/theme/common/tokenClassificationRegistry";
import { reverseConvert } from "../texmate/theme-converter";
import { findMatchingThemeRule } from "../texmate/TMHelper";
const registry = getTokenClassificationRegistry();

export function addSemanticTokenRules(theme: monaco.editor.IStandaloneThemeData) {
  const converted = reverseConvert(theme);

  for (const rule of registry.getTokenStylingDefaultRules()) {
    const monacoRule = theme.rules.find((themeRule) => themeRule.token === rule.selector.id);
    if (monacoRule) {
      console.warn("token", rule.selector.id, "in theme rules");
    }
    const probeScopes = rule.defaults.scopesToProbe;
    if (!probeScopes) continue;

    const flattened = probeScopes.flat();
    flattened.reverse();
    const matchingThemeRule = findMatchingThemeRule(converted, flattened, true);
    if (!matchingThemeRule) {
      console.warn("No matching theme rule found for scope array", flattened);
      continue;
    }
    console.log(
      `${rule.selector.id} -> ${JSON.stringify(flattened)} -> ${matchingThemeRule.scope}, -> %c${
        matchingThemeRule.settings.foreground
      }`,
      `background: ${matchingThemeRule.settings.foreground};color:black`
    );
    theme.rules.push({
      token: rule.selector.id,
      foreground: matchingThemeRule.settings.foreground,
      background: matchingThemeRule.settings.background,
      fontStyle: matchingThemeRule.settings.fontStyle,
    });
  }
}
