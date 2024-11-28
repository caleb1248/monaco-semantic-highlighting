import * as monaco from "typed-monaco-editor-core";
import { type IColorTheme, TMToMonacoToken } from "../textmate/tm-to-monaco-token";
import { getTokenClassificationRegistry } from "typed-monaco-editor-core/esm/vs/platform/theme/common/tokenClassificationRegistry";
import { IThemeService } from "typed-monaco-editor-core/esm/vs/platform/theme/common/themeService";
import { StandaloneServices } from "typed-monaco-editor-core/esm/vs/editor/standalone/browser/standaloneServices";

const theRegistry = getTokenClassificationRegistry();

function resolveToken(service: IThemeService) {}
