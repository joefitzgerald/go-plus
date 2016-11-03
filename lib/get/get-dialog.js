'use babel'

import {CompositeDisposable} from 'atom'

class GetDialog {
  constructor (identifier, callback) {
    this.callback = callback
    this.element = document.createElement('div')
    this.element.classList.add('goget')

    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add(this.element, 'core:cancel', () => { this.cancel() }))
    this.subscriptions.add(atom.commands.add(this.element, 'core:confirm', () => { this.confirm() }))

    let message = document.createElement('div')
    message.textContent = 'Which Go Package Would You Like To Get?'
    message.style.padding = '1em'
    this.element.appendChild(message)

    this.input = document.createElement('atom-text-editor')
    this.input.setAttribute('mini', true)
    this.input.getModel().setText(identifier)
    this.element.appendChild(this.input)
  }

  attach () {
    this.panel = atom.workspace.addModalPanel({
      item: this.element
    })
    this.input.focus()
  }

  cancel () {
    this.close()
  }

  confirm () {
    let pack = this.input.getModel().getText()
    this.close()
    if (this.callback) {
      this.callback(pack)
    }
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

export {GetDialog}
