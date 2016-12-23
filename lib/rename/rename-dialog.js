/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import {CompositeDisposable, TextEditor} from 'atom'
import etch from 'etch'
import EtchComponent from './../etch-component'

export default class RenameDialog extends EtchComponent {
  constructor (props) {
    super(props)

    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add(this.element, 'core:cancel', () => { this.cancel() }))
    this.subscriptions.add(atom.commands.add(this.element, 'core:confirm', () => { this.confirm() }))

    this.oncancel = null
    this.panel = null
  }

  render () {
    return (
      <div className='gorename'>
        <div style='padding: 1em;'>
          Rename {this.props.identifier} to:
        </div>
        <TextEditor ref='input' mini />
      </div>
    )
  }

  attach () {
    const input = this.refs.input
    if (input) {
      this.panel = atom.workspace.addModalPanel({
        item: this
      })
      input.setText(this.props.identifier)
      input.selectAll()
      input.element.focus()
    }
  }

  onCancelled (callback) {
    this.oncancel = callback
  }

  cancel () {
    const cancel = this.oncancel
    this.destroy()
    if (cancel) {
      cancel()
    }
  }

  confirm () {
    const newName = this.refs.input.getText()
    const callback = this.props.callback
    this.destroy()
    if (callback) {
      callback(newName)
    }
  }

  dispose () {
    this.destroy()
  }

  destroy () {
    super.destroy()

    this.subscriptions.dispose()

    if (this.panel) {
      this.panel.destroy()
    }
    this.panel = null
  }
}
