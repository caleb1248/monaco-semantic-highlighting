import { Emitter } from "typed-monaco-editor-core";
import { Event } from "typed-monaco-editor-core/esm/vs/base/common/event";
import { Disposable } from "typed-monaco-editor-core/esm/vs/base/common/lifecycle";
import {
  IColorTheme,
  IFileIconTheme,
  IThemeService,
} from "typed-monaco-editor-core/esm/vs/platform/theme/common/themeService";

export class TextmateThemeService extends Disposable implements IThemeService {
  _serviceBrand: undefined;

  private _colorThemeChangeEmitter = this._register(new Emitter<IColorTheme>());
  public onDidColorThemeChange = this._colorThemeChangeEmitter.event;

  private _colorTheme: TextmateColorTheme;

  public getColorTheme(): IColorTheme {}

  public getFileIconTheme(): IFileIconTheme {
    return {
      hasFileIcons: false,
      hasFolderIcons: false,
      hidesExplorerArrows: false,
    };
  }

  private readonly _fileIconThemeChangeEmitter = this._register(new Emitter<IFileIconTheme>());
  public readonly onDidFileIconThemeChange = this._fileIconThemeChangeEmitter.event;
}

export interface ITextmateColorThemeData {
  colors: Record<string, string>;
}

export class TextmateColorTheme implements IColorTheme {
  constructor(data: ITextmateColorThemeData) {}
}
