// @flow

export type SuggestionType =
  | 'variable'
  | 'constant'
  | 'property'
  | 'value'
  | 'method'
  | 'function'
  | 'class'
  | 'type'
  | 'keyword'
  | 'tag'
  | 'snippet'
  | 'import'
  | 'require'
  | 'attribute'

export type Suggestion = {
  text?: string,
  snippet?: string,

  displayText?: string,
  replacementPrefix?: string,
  type?: SuggestionType,
  leftLabel?: string,
  leftLabelHTML?: string,
  rightLabel?: string,
  rightLabelHTML?: string,
  className?: string,
  iconHTML?: string,
  description?: string,
  descriptionMoreURL?: string
}

export type AtomPoint = {
  row: number,
  column: number,
  copy: () => AtomPoint
}

export type SuggestionRequest = {
  editor: any,
  bufferPosition: AtomPoint,
  scopeDescriptor: string,
  prefix: string,
  activatedManually: bool
}

export interface AutocompleteProvider {
  selector: string,
  disableForSelector?: string,

  inclusionPriority?: number,
  excludeLowerPriority?: bool,
  suggestionPriority?: number,
  filterSuggestions?: bool,

  +dipose?: () => void,
  +onDidInsertSuggestion?: ({editor: any, triggerPosition: any, suggestion: Suggestion}) => void,

  +getSuggestions: (SuggestionRequest) => Array<Suggestion> | Promise<Array<Suggestion>> | null
}
