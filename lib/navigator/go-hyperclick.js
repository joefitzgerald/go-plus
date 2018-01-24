// @flow
'use babel'

import type {Godef} from './godef'
import {isValidEditor} from '../utils'

// TODO: add hyperclick provider flow types (Atom IDE?)

class GoHyperclick {
  providerName: string
  godef: null | () => Godef
  maybeIdentifier: RegExp
  disableForSelector: Array<string>
  disposed: bool

  constructor (godefFunc: () => Godef) {
    this.providerName = 'go-hyperclick'
    this.godef = godefFunc
    this.maybeIdentifier = /^[$0-9\w]+$/
    this.disableForSelector = [
      '.storage.type',
      '.storage.type',
      '.string.quoted',
      '.string.quoted',
      '.keyword',
      '.support.function.builtin',
      '.constant.numeric.integer',
      '.constant.language',
      '.variable.other.assignment',
      '.variable.other.declaration',
      '.comment.line'
    ]
    this.disposed = false
  }

  dispose () {
    this.disposed = true
    this.godef = null
    this.disableForSelector = []
  }

  getSuggestionForWord (editor: any, text: string, range: any) {
    if (!isValidEditor(editor) || !text.match(this.maybeIdentifier)) {
      return
    }

    const scopeChain = editor.scopeDescriptorForBufferPosition(range.start).getScopeChain()
    const found = this.disableForSelector.some((selector) => {
      return scopeChain.indexOf(selector) !== -1
    })

    if (found) {
      return
    }

    const g = this.godef ? this.godef() : null
    if (!g) {
      return
    }

    return {
      range: range,
      callback: () => {
        if (this.disposed || !editor || !editor.getBuffer() || !g) {
          return
        }
        g.gotoDefinitionForBufferPosition(range.start, editor)
      }
    }
  }
}

export {GoHyperclick}
