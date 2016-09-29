/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import {CompositeDisposable} from 'atom'
import etch from 'etch'
import EtchComponent from '../etch-component'

export default class GoInformationView extends EtchComponent {
  constructor (props) {
    if (!props.content) {
      props.content = ''
    }
    super(props)
    this.subscriptions = new CompositeDisposable()
    if (props.model) {
      props.model.view = this
      props.model.updateContent()
    }
  }

  render () {
    let style = 'white-space: pre-wrap;'
    if (this.props.style) {
      style = style + ' ' + this.props.style
    }
    return (
      <span ref='content' style={style} tabIndex='-1'>
        {this.props.content}
      </span>
    )
  }

  dispose () {
    this.destroy()
  }

  destroy () {
    super.destroy()
    this.subscriptions.dispose()
  }
}
