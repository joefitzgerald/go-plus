// @flow

export type SuggestionType =
  | 'package'
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

export type SuggestionRequest = {
  editor: TextEditor,
  bufferPosition: atom$Point,
  scopeDescriptor: string,
  prefix: string,
  activatedManually: boolean
}

export interface AutocompleteProvider {
  selector: string;
  disableForSelector?: string;

  inclusionPriority?: number;
  excludeLowerPriority?: boolean;
  suggestionPriority?: number;
  filterSuggestions?: boolean;

  +dipose?: () => void;
  +onDidInsertSuggestion?: ({
    editor: TextEditor,
    triggerPosition: atom$Point,
    suggestion: Suggestion
  }) => void;

  +getSuggestions: SuggestionRequest =>
    | Array<Suggestion>
    | Promise<Array<Suggestion>>
    | null;
}
