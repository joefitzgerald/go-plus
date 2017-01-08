'use babel'

import {CompositeDisposable} from 'atom'

export default class GodocPanel {
  constructor () {
    this.key = 'reference'
    this.tab = {
      name: 'Reference',
      packageName: 'go-plus',
      icon: 'book',
      order: 300
    }
    this.subscriptions = new CompositeDisposable()

    this.keymap = 'alt-d'
    const bindings = atom.keymaps.findKeyBindings({command: 'golang:showdoc'})
    if (bindings && bindings.length) {
      this.keymap = bindings[0].keystrokes
    }
  }

  dispose () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    this.requestFocus = null
    this.view = null
  }

  updateContent (doc) {
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
