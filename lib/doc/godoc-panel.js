// @flow
'use babel'

import type {Tab, PanelModel} from './../panel/tab'
import type {GogetdocResult} from './godoc'
import type GodocView from './godoc-view'

export default class GodocPanel implements PanelModel {
  key: string
  tab: Tab
  keymap: string
  msg: ?string
  requestFocus: ?() => Promise<void>
  view: ?GodocView
  doc: ?GogetdocResult

  constructor () {
    this.key = 'reference'
    this.tab = {
      name: 'Reference',
      packageName: 'go-plus',
      icon: 'book',
      order: 300
    }

    this.keymap = 'alt-d'
    const bindings = atom.keymaps.findKeyBindings({command: 'golang:showdoc'})
    if (bindings && bindings.length) {
      this.keymap = bindings[0].keystrokes
    }
  }

  dispose () {
    this.requestFocus = null
    this.view = null
  }

  updateMessage (msg: string) {
    this.msg = msg
    if (this.requestFocus) {
      this.requestFocus()
    }
    if (this.view) {
      this.view.update()
    }
  }

  updateContent (doc: ?GogetdocResult) {
    this.msg = null
    this.doc = doc
    if (!doc) {
      return
    }
    if (this.requestFocus) {
      this.requestFocus()
    }
    if (this.view) {
      this.view.update()
    }
  }
}
