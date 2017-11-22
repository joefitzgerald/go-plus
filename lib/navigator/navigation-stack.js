// @flow
'use babel'

import {openFile} from '../utils'

import type {DefLocation} from './definition-types'

class NavigationStack {
  maxSize: number
  stack: Array<DefLocation>

  constructor (maxSize: number = 500) {
    this.maxSize = maxSize >= 1 ? maxSize : 1
    this.stack = []
  }

  dispose () {
    this.stack = []
  }

  isEmpty () {
    return this.stack.length === 0
  }

  reset () {
    this.stack = []
  }

  pushCurrentLocation () {
    const editor = atom.workspace.getActiveTextEditor()
    if (!editor) {
      return
    }
    const loc: DefLocation = {
      pos: editor.getCursorBufferPosition(),
      filepath: editor.getURI()
    }

    if (!loc.pos.row || !loc.pos.column) {
      return
    }

    this.push(loc)
  }

  // Returns a promise that is complete when navigation is done.
  restorePreviousLocation (): Promise<any> {
    if (this.isEmpty()) {
      return Promise.resolve()
    }

    if (!this.stack || this.stack.length < 1) {
      return Promise.resolve()
    }

    const lastLocation = this.stack.shift()
    return openFile(lastLocation.filepath, lastLocation.pos)
  }

  push (loc: DefLocation) {
    if (!this.stack || !loc) {
      return
    }

    if (!this.isEmpty() && this.compareLoc(this.stack[0], loc)) {
      return
    }
    this.stack.unshift(loc)
    if (this.stack.length > this.maxSize) {
      this.stack.splice(-1, this.stack.length - this.maxSize)
    }
  }

  compareLoc (loc1: DefLocation, loc2: DefLocation) {
    if (!loc1 && !loc2) {
      return true
    }

    if (!loc1 || !loc2) {
      return false
    }

    const posEqual = (pos1, pos2) => {
      if (!pos1 && !pos2) {
        return true
      }
      if (!pos1 || !pos2) {
        return false
      }
      return ((pos1.column === pos2.column) && (pos1.row === pos2.row))
    }

    return (loc1.filepath === loc2.filepath) && posEqual(loc1.pos, loc2.pos)
  }
}

export {NavigationStack}
