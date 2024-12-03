import { Color } from "vscode/vscode/vs/base/common/color";
import { ColorScheme } from "vscode/vscode/vs/platform/theme/common/theme";
import { IColorTheme, ITokenStyle } from "vscode/vscode/vs/platform/theme/common/themeService";
import {
  ColorIdentifier,
  getColorRegistry,
} from "vscode/vscode/vs/platform/theme/common/colorUtils";
import { IRawThemeSetting } from "vscode-textmate/release/theme";
import { getTokenClassificationRegistry } from "vscode/vscode/vs/platform/theme/common/tokenClassificationRegistry";

const colorRegistry = getColorRegistry();
const tokenClassificationRegistry = getTokenClassificationRegistry();

export interface ITextmateColorThemeData {
  type: "dark" | "light" | "hcDark" | "hcLight";
  colors: Record<string, string>;
  tokenColors: IRawThemeSetting[];
}

export class TextmateColorTheme implements IColorTheme {
  type: ColorScheme;
  label: string;
  private _themeData: ITextmateColorThemeData;

  public get tokenColors(): IRawThemeSetting[] {
    const colors: IRawThemeSetting[] = [];
    const editorForeground = this.getColor("editor.foreground", true)!.toString();
    const editorBackground = this.getColor("editor.background", true)!.toString();

    colors.push({
      settings: {
        foreground: editorForeground,
        background: editorBackground,
      },
    });

    colors.push(...this._themeData.tokenColors);

    return colors;
  }

  public get themeData(): ITextmateColorThemeData {
    const themeData: ITextmateColorThemeData = {
      ...this._themeData,
      tokenColors: [...this._themeData.tokenColors],
    };

    return themeData;
  }

  private defaultColorCache: Record<string, Color | undefined> = Object.create(null);

  private themeColors: Map<string, Color> | null;

  constructor(name: string, data: ITextmateColorThemeData) {
    this._themeData = data;
    this.label = name;

    this.themeColors = null;

    switch (data.type) {
      case "dark":
        this.type = ColorScheme.DARK;
        break;
      case "hcDark":
        this.type = ColorScheme.HIGH_CONTRAST_DARK;
        break;
      case "hcLight":
        this.type = ColorScheme.HIGH_CONTRAST_LIGHT;
        break;
      default:
        this.type = ColorScheme.LIGHT;
    }
  }

  public getColor(color: ColorIdentifier, useDefault?: boolean): Color | undefined {
    let colorValue = this.getThemeColors().get(color);

    if (!colorValue && useDefault !== false) {
      colorValue = this.getDefaultColor(color);
    }

    if (!colorValue) {
      console.warn("color", color, "not found");
      return Color.transparent;
    }

    return colorValue;
  }

  private getThemeColors(): Map<string, Color> {
    if (!this.themeColors) {
      this.themeColors = new Map<string, Color>();
      for (const id in this.themeData.colors) {
        this.themeColors.set(id, Color.fromHex(this.themeData.colors[id]));
      }
    }

    return this.themeColors;
  }

  private getDefaultColor(id: ColorIdentifier): Color | undefined {
    const cacheColor = this.defaultColorCache[id];
    if (cacheColor) return cacheColor;

    const colorValue = colorRegistry.resolveDefaultColor(id, this);
    this.defaultColorCache[id] = colorValue;
    return colorValue;
  }

  public getAllColors(): Record<string, string> {
    const colors: Record<string, string> = Object.create(null);
    for (const contribution of colorRegistry.getColors()) {
      const color = this.getColor(contribution.id, true);
      if (color) colors[contribution.id] = color.toString();
    }

    return colors;
  }

  public defines(color: ColorIdentifier): boolean {
    return this.getThemeColors().has(color);
  }

  public semanticHighlighting = true;

  private _tokenColorMap: string[] | undefined;

  public get tokenColorMap(): string[] {
    if (this._tokenColorMap) return this._tokenColorMap;
    const colorMap: string[] = [];
    const color2id = Object.create(null);
    let currentId = 0;

    const tokenColors = this.tokenColors;

    function addColor(color: string) {
      if (color2id[color]) return;
      const id = currentId++;
      colorMap[id] = color;
      color2id[color] = id;
      return;
    }

    for (const token of tokenColors) {
      if (token.settings.foreground) addColor(token.settings.foreground);
      if (token.settings.background) addColor(token.settings.background);
    }

    for (const rule of tokenClassificationRegistry.getTokenStylingDefaultRules()) {
      const color = rule.defaults[this.type];
      if (color && typeof color === "object") {
        if (color.foreground) addColor(color.foreground.toString());
      }
    }

    this._tokenColorMap = colorMap;

    console.log("colorMap", colorMap);
    return colorMap;
  }

  public getTokenStyleMetadata(
    type: string,
    modifiers: string[],
    modelLanguage: string
  ): ITokenStyle | undefined {
    // console.log("getting token style metadata", type, modifiers, modelLanguage);
    const rules = tokenClassificationRegistry.getTokenStylingDefaultRules();

    let bestTokenStyle = {
      foreground: 0,
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
    };
    let bestScore = 0;

    for (const rule of rules) {
      const score = rule.selector.match(type, modifiers, modelLanguage);
      if (score > bestScore) {
        bestScore = score;
        const tokenStyle = rule.defaults[this.type];
        if (typeof tokenStyle === "object") {
          const foreground = this.tokenColorMap.indexOf(
            tokenStyle.foreground?.toString() || this.tokenColorMap[0]
          );

          bestTokenStyle = {
            foreground,
            bold: tokenStyle.bold ?? false,
            italic: tokenStyle.italic ?? false,
            underline: tokenStyle.underline ?? false,
            strikethrough: tokenStyle.strikethrough ?? false,
          };
        }
      }
    }
    console.log(bestTokenStyle);
    return bestTokenStyle;
  }
}
