// @flow
/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import {CompositeDisposable, TextEditor} from 'atom'
import etch from 'etch'
import EtchComponent from './../etch-component'

import type {Tag} from './gomodifytags'

export type AcceptedCallback = ({
  tags: Array<Tag>,
  transform: 'snakecase' | 'camelcase', // | 'lispcase'
  sortTags: boolean
}) => any

export default class TagsDialog extends EtchComponent {
  tags: Array<Tag>
  case: 'snakecase' | 'camelcase' // | 'lispcase'
  tagRegex: RegExp
  optionRegex: RegExp
  subscriptions: CompositeDisposable
  panel: any
  element: HTMLElement
  onAccept: ?AcceptedCallback
  sortTags: bool

  constructor (props: Object) {
    super(props)
    this.tags = []
    this.case = 'snakecase'

    this.tagRegex = /^[\w]*$/
    this.optionRegex = /^[\w,]*$/

    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add(this.element, 'core:cancel', () => { this.cancel() }))
    this.subscriptions.add(atom.commands.add(this.element, 'core:confirm', () => { this.confirm() }))

    this.subscriptions.add(this.refs.tag.onDidStopChanging(() => this.checkInput(this.refs.tag, this.tagRegex)))
    this.subscriptions.add(this.refs.option.onDidStopChanging(() => this.checkInput(this.refs.option, this.optionRegex)))

    this.panel = null
    this.onAccept = null

    etch.update(this)
  }

  render () {
    const icon = this.props.mode === 'Add' ? 'icon icon-tag-add' : 'icon icon-tag-remove'
    const tags = this.tags && this.tags.length
      ? this.tags.map(this.makeListItem)
      : null
    const radioButtons = this.props.mode === 'Add'
      ? (
        <div className='case-radio-buttons'>
          <label>Case: </label>
          <label className='input-label'><input className='input-radio' type='radio' caseOption='snakecase' name='caseRadio' on={{change: this.caseChanged}} checked /> snake_case</label>
          <label className='input-label'><input className='input-radio' type='radio' caseOption='camelcase' name='caseRadio' on={{change: this.caseChanged}} /> camelCase</label>
          <label className='input-label'><input className='input-radio' type='radio' caseOption='lispcase' name='caseRadio' on={{change: this.caseChanged}} /> lisp-case</label><br />
          <label className='input-label'><input className='input-toggle' type='checkbox' ref='sortCheckbox' on={{change: this.sortChanged}} /> Sort Tags</label>
        </div>
      )
      : null

    return (
      <div className='gomodifytags'>
        <h1><span className={icon}>{this.props.mode} Tags</span></h1>
        <div className='go-tags-flex-container'>
          <div className='tag'><TextEditor mini ref='tag' placeholderText='tag (eg. json)' /></div>
          <div className='option'><TextEditor mini ref='option' placeholderText='option (eg. omitempty)' /></div>
          <button className='btn icon icon-file-add add' onclick={() => this.addTag()}>Add</button>
        </div>
        {radioButtons}
        {tags &&
          <div className='go-tags-list'>
            <h3>Tags to {this.props.mode}:</h3>
            <ul>
              {tags}
            </ul>
          </div>
        }
        <div className='block'>
          <button className='btn' onclick={() => this.confirm()} ref='submitButton'>Submit</button>
          <button className='btn' onclick={() => this.cancel()}>Cancel</button>
        </div>
      </div>
    )
  }

  checkInput (editor: any, regex: RegExp) {
    if (regex.test(editor.getText())) {
      editor.element.classList.remove('invalid-input-value')
    } else {
      editor.element.classList.add('invalid-input-value')
    }
  }

  makeListItem (tag: Tag, index: number): any {
    let text = tag.tag
    if (tag.option) {
      text += ' (' + tag.option + ')'
    }
    return <li key={index}>{text}</li>
  }

  caseChanged (evt: any) {
    this.case = evt.target.caseOption
  }

  sortChanged () {
    this.sortTags = this.refs.sortCheckbox.checked
  }

  addTag () {
    const tag = this.refs.tag.getText()
    const opt = this.refs.option.getText()
    if (tag) {
      this.tags.push({tag: tag, option: opt})
      this.refs.tag.setText('')
      this.refs.option.setText('')
      this.update()
      this.refs.tag.element.focus()
    }
  }

  attach () {
    this.subscriptions.add(atom.commands.add(this.element,
      'gomodifytags:focus-next', () => this.focusNextElement(1)))
    this.subscriptions.add(atom.commands.add(this.element,
      'gomodifytags:focus-previous', () => this.focusNextElement(-1)))

    this.panel = atom.workspace.addModalPanel({
      item: this
    })
    this.refs.tag.element.focus()
  }

  confirm () {
    if (this.tags.length === 0) {
      this.addTag()
    }
    if (this.onAccept) {
      this.onAccept({
        tags: this.tags,
        transform: this.case,
        sortTags: this.sortTags
      })
    }
    this.destroy()
  }

  focusNextElement (direction: number) {
    const elements: Array<any> = [this.refs.tag.element, this.refs.option.element, this.refs.submitButton]
    const focusedElement = elements.find((el: any) => el.classList.contains('is-focused'))
    if (!focusedElement) {
      return
    }
    let focusedIndex = elements.indexOf(focusedElement)

    focusedIndex += direction
    if (focusedIndex >= elements.length) {
      focusedIndex = 0
    } else if (focusedIndex < 0) {
      focusedIndex = elements.length - 1
    }

    elements[focusedIndex].focus()
    if (elements[focusedIndex].getModel) {
      elements[focusedIndex].getModel().selectAll()
    }
  }

  cancel () {
    this.destroy()
  }

  dispose () {
    this.destroy()
  }

  destroy () {
    super.destroy()
    this.subscriptions.dispose()
    this.subscriptions = null
    this.tags = []
    this.onAccept = null

    if (this.panel) {
      this.panel.destroy()
      this.panel = null
    }
  }
}
