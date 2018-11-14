// @flow

import type { Navigator } from './navigator'
import { isValidEditor } from '../utils'

type Definition = {
  path: string, // Path of the file in which the definition is located.
  position: atom$Point, // First character of the definition's identifier.
  range?: atom$Range, // the range of the entire definition.
  name?: string, // display a more human-readable title inside Hyperclick
  projectRoot?: string, // used to display a relativized version of path
  language: string
}

type DefinitionQueryResult = {
  queryRange: ?Array<atom$Range>,
  definitions: Array<Definition> // Must be non-empty.
}

class DefinitionProvider {
  priority: number
  grammarScopes: Array<string>
  navigator: null | (() => Navigator)
  maybeIdentifier: RegExp
  disableForSelector: Array<string>
  disposed: boolean

  constructor(navigatorFunc: () => Navigator) {
    this.priority = 10
    this.grammarScopes = ['source.go', 'go']
    this.navigator = navigatorFunc
    this.maybeIdentifier = /^[$0-9\w]+$/

    this.disableForSelector = [
      // original textmate selectors
      '.storage.type',
      '.string.quoted',
      '.keyword',
      '.support.function.builtin',
      '.constant.numeric.integer',
      '.constant.language',
      '.variable.other.assignment',
      '.variable.other.declaration',
      '.comment.line',
      'entity.name.import.go',

      // tree-sitter selectors
      'comment.block',
      'comment.line',
      'string.quoted.double',
      'constant.character.escape',
      'constant.other.rune',
      'constant.numeric.float',
      'constant.language.nil',
      'constant.language.false',
      'constant.language.true',
      'keyword.operator',
      'keyword.import'
    ]
    this.disposed = false
  }

  dispose() {
    this.disposed = true
    this.navigator = null
    this.disableForSelector = []
  }

  async getDefinition(
    editor: atom$TextEditor,
    position: atom$Point
  ): Promise<?DefinitionQueryResult> {
    if (!isValidEditor(editor)) {
      return null
    }

    const scopes = editor
      .scopeDescriptorForBufferPosition(position)
      .getScopesArray()
    const disabled = this.disableForSelector.some(s => scopes.includes(s))
    if (disabled) {
      console.log('skipping Go definition - current scopes:', scopes) // eslint-disable-line no-console
      return null
    }

    const nav = this.navigator ? this.navigator() : null
    if (!nav) return null

    const loc = await nav.definitionForBufferPosition(position, editor)
    if (!loc) return null

    const def = {
      path: loc.filepath,
      position: loc.pos,
      language: 'Go'
    }
    return { definitions: [def], queryRange: null }
  }
}

export { DefinitionProvider }
