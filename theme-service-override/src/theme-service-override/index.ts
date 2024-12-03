import { Emitter } from "monaco-editor";
import {
  IColorTheme,
  IFileIconTheme,
  IProductIconTheme,
} from "vscode/vscode/vs/platform/theme/common/themeService";
import { IThemeService } from "vscode/services";
import { Disposable } from "vscode/vscode/vs/base/common/lifecycle";
import { COLOR_THEME_LIGHT_INITIAL_COLORS } from "vscode/vscode/vs/workbench/services/themes/common/workbenchThemeService";
import { generateTokensCSSForColorMap } from "vscode/vscode/vs/editor/common/languages/supports/tokenization";
import { asCssVariableName } from "vscode/vscode/vs/platform/theme/common/colorUtils";
import { TextmateColorTheme, ITextmateColorThemeData } from "./colorTheme";
import { Color } from "vscode/vscode/vs/base/common/color";
import { createStyleSheet } from "../missing-files/domStylesheets";
import {
  getIconsStyleSheet,
  UnthemedProductIconTheme,
} from "vscode/vscode/vs/platform/theme/browser/iconsStyleSheet";
// import css from "../../node_modules/vscode/vscode/src/vs/base/browser/ui/codicons/codicon/codicon.css.js";
// console.log(css);
const selector = "body";

export class TextmateThemeService extends Disposable implements IThemeService {
  _serviceBrand: undefined;

  private _colorThemeChangeEmitter = this._register(new Emitter<TextmateColorTheme>());
  public onDidColorThemeChange = this._colorThemeChangeEmitter.event;

  private _colorTheme: TextmateColorTheme;

  private _themes: Map<string, TextmateColorTheme> = new Map();

  public getColorTheme(): IColorTheme {
    return this._colorTheme;
  }

  public setTheme(name: string): void {
    const theme = this._themes.get(name);
    if (theme) {
      this._colorTheme = theme;
      this._colorThemeChangeEmitter.fire(theme);
    }
  }
  public defineTheme(name: string, data: ITextmateColorThemeData): void {
    const theme = new TextmateColorTheme(name, data);
    this._themes.set(name, theme);
  }

  public getFileIconTheme(): IFileIconTheme {
    return {
      hasFileIcons: false,
      hasFolderIcons: false,
      hidesExplorerArrows: false,
    };
  }

  private _unthemedProductIconTheme = new UnthemedProductIconTheme();

  public getProductIconTheme(): IProductIconTheme {
    return this._unthemedProductIconTheme;
  }

  private readonly _fileIconThemeChangeEmitter = this._register(new Emitter<IFileIconTheme>());
  public readonly onDidFileIconThemeChange = this._fileIconThemeChangeEmitter.event;

  private readonly _productIconThemeChangeEmitter = this._register(
    new Emitter<IProductIconTheme>()
  );
  public readonly onDidProductIconThemeChange = this._productIconThemeChangeEmitter.event;

  constructor() {
    super();

    const colorStyleSheet = createStyleSheet();
    colorStyleSheet.id = "monaco-editor-colors";

    const codiconStyleSheet = createStyleSheet();
    codiconStyleSheet.id = "codiconStyles";

    const iconStyleSheet = this._register(getIconsStyleSheet(this));
    codiconStyleSheet.textContent = iconStyleSheet.getCSS();
    this._register(
      iconStyleSheet.onDidChange(() => {
        console.log("did change stylesheet");
        codiconStyleSheet.textContent = iconStyleSheet.getCSS();
      })
    );

    // codiconStyleSheet.textContent = css;

    this._register(
      this.onDidColorThemeChange((theme) => {
        console.log("generating css...");
        const tokenColorMap = theme.tokenColorMap.map((c) => Color.fromHex(c));
        colorStyleSheet.innerHTML =
          generateTokensCSSForColorMap(tokenColorMap) +
          "\n" +
          generateColorsCSS(theme.getAllColors());
      })
    );
    this._colorTheme = new TextmateColorTheme("light", {
      type: "light",
      colors: COLOR_THEME_LIGHT_INITIAL_COLORS,
      tokenColors: [],
    });

    this._colorThemeChangeEmitter.fire(this._colorTheme);
  }

  registerEditorContainer() {
    // do nothing, it's called by `StandaloneEditor` but we don't care about it
    return {
      dispose() {},
    };
  }
}

const service = new TextmateThemeService();
export default function getThemeServiceOverride() {
  return {
    [IThemeService.toString()]: service,
  };
}

function generateColorsCSS(colors: Record<string, string>) {
  let css = selector + " {\n";
  for (const [key, value] of Object.entries(colors)) {
    css += `${asCssVariableName(key)}: ${value};\n`;
  }
  css += "}\n";
  return css;
}
