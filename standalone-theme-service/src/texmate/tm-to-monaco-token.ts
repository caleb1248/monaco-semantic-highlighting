import { findMatchingThemeRule, IColorTheme } from "./TMHelper";
export function TMToMonacoToken(theme: IColorTheme, scopes: string[]) {
  const themeRule = findMatchingThemeRule(theme, scopes, true);
  return themeRule ? themeRule.scope : "";
}
