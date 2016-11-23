'use babel'

import {CompositeDisposable} from 'atom'

class RenameDialog {
  constructor (identifier, callback) {
    this.identifier = identifier
    this.callback = callback
    this.element = document.createElement('div')
    this.element.classList.add('gorename')

    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add(this.element, 'core:cancel', () => { this.cancel() }))
    this.subscriptions.add(atom.commands.add(this.element, 'core:confirm', () => { this.confirm() }))

    this.oncancel = null

    let message = document.createElement('div')
    message.textContent = `Rename ${identifier} to:`
    message.style.padding = '1em'
    this.element.appendChild(message)

    this.input = document.createElement('atom-text-editor')
    this.input.setAttribute('mini', true)
    this.element.appendChild(this.input)
  }

  attach () {
    this.panel = atom.workspace.addModalPanel({
      item: this.element
    })
    this.input.model.setText(this.identifier)
    this.input.model.selectAll()
    this.input.focus()
  }

  onCancelled (callback) {
    this.oncancel = callback
  }

  cancel () {
    this.close()
    if (this.oncancel) {
      this.oncancel()
      this.oncancel = null
    }
  }

  confirm () {
    let newName = this.input.getModel().getText()
    this.close()
    this.callback(newName)
    this.callback = null
  }

  close () {
    this.subscriptions.dispose()
    if (this.element) {
      this.element.remove()
    }
    this.element = null

    if (this.panel) {
      this.panel.destroy()
    }
    this.panel = null
  }
}

export {RenameDialog}
