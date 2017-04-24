'use babel'

export default class GodocPanel {
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

  updateMessage (msg) {
    this.msg = msg
    if (this.requestFocus) {
      this.requestFocus()
    }
    if (this.view) {
      this.view.update()
    }
  }

  updateContent (doc) {
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
