import * as monaco from "monaco-editor";
import { type IColorTheme, TMToMonacoToken } from "../textmate/tm-to-monaco-token";

type LanguageId = string;
type SemanticTokenType = string;

type SemanticTokenMapping = Record<SemanticTokenType, string | undefined>;

const tokenMapping: SemanticTokenMapping = {
  namespace: "entity.name.namespace",
  type: "entity.name.type",
  "type.defaultLibrary": "support.type",
  struct: "storage.type.struct",
  class: "entity.name.type.class",
  "class.defaultLibrary": "support.class",
  interface: "entity.name.type.interface",
  enum: "entity.name.type.enum",
  function: "entity.name.function",
  "function.defaultLibrary": "support.function",
  method: "entity.name.function.member",
  macro: "entity.name.function.macro",
  variable: "variable.other.readwrite, entity.name.variable",
  "variable.readonly": "variable.other.constant",
  "variable.readonly.defaultLibrary": "support.constant",
  parameter: "variable.parameter",
  property: "variable.other.property",
  "property.readonly": "variable.other.constant.property",
  enumMember: "variable.other.enummember",
  event: "variable.other.event",
};

const mappingContributions: Record<LanguageId, Record<SemanticTokenType, string> | undefined> = {};

function getTmScopeForSemanticToken(
  semanticToken: SemanticTokenType,
  languageId: LanguageId
): string | undefined {
  if (mappingContributions[languageId] && mappingContributions[languageId]![semanticToken]) {
    return mappingContributions[languageId]![semanticToken];
  }

  return tokenMapping[semanticToken];
}

function createDocumentSemanticTokensProvider(
  languageId: string,
  provider: monaco.languages.DocumentSemanticTokensProvider
): monaco.languages.DocumentSemanticTokensProvider {
  return {
    getLegend() {
      const originalLegend = provider.getLegend();
      return {};
    },
  } satisfies monaco.languages.DocumentSemanticTokensProvider;
}

/**
 *
 * @param languageId The id of the language to register the mapping for. If ndefined, the mapping will be registered globally.u
 * @param mapping The mapping to register.
 *
 * @example
 * ```ts
 * registerMappingContributions("typescript", {
 *  "type.defaultLibrary": "support.type",
 *  "function.defaultLibrary": "support.function",
 * });
 */
function registerMappingContributions(
  languageId: LanguageId | undefined,
  mapping: Record<SemanticTokenType, string>
) {
  if (languageId) {
    mappingContributions[languageId] = { ...(mappingContributions[languageId] || {}), ...mapping };
    return;
  }

  for (const key in mapping) {
    tokenMapping[key] = mapping[key];
  }
}

export { registerMappingContributions };
