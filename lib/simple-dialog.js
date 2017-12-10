// @flow

/** @jsx etch.dom */

import {CompositeDisposable, TextEditor} from 'atom'
import etch from 'etch'
import EtchComponent from './etch-component'

type Props = {
  prompt: string,
  initialValue?: string,
  onConfirm: (string) => void,
  onCancel?: () => void
}

export default class SimpleDialog extends EtchComponent {
  props: Props
  subscriptions: CompositeDisposable
  panel: any
  previouslyFocusedElement: ?HTMLElement

  constructor (props: Props) {
    super(props)

    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add(this.element, 'core:cancel', () => this.cancel()))
    this.subscriptions.add(atom.commands.add(this.element, 'core:confirm', () => this.confirm()))
  }

  render () {
    const {prompt} = this.props
    return (
      <div className='go-plus-dialog'>
        <div style='padding: 1em;'>
          {prompt}
        </div>
        <TextEditor ref='input' mini />
      </div>
    )
  }

  attach () {
    const {input, initialValue} = this.refs
    if (input) {
      this.panel = atom.workspace.addModalPanel({item: this})
      if (initialValue) {
        input.setText(initialValue)
        input.selectAll()
      }
      this.previouslyFocusedElement = document.activeElement
      input.element.focus()
    }
  }

  confirm () {
    const value = this.refs.input.getText()
    const {onConfirm} = this.props
    this.destroy()
    if (onConfirm) {
      onConfirm(value)
    }
  }

  cancel () {
    const {onCancel} = this.props
    this.destroy()
    if (onCancel) {
      onCancel()
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
      this.panel = null
    }
    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus()
      this.previouslyFocusedElement = null
    }
  }
}
