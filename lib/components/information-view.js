/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import {CompositeDisposable} from 'atom'
import etch from 'etch'
import EtchComponent from './etch-component'

export default class InformationView extends EtchComponent {
  constructor (props) {
    console.log('constructing info view')
    if (!props.content) {
      props.content = 'empty'
    }
    super(props)
    this.subscriptions = new CompositeDisposable()
    if (props.model) {
      console.log('model')
      props.model.view = this
      props.model.updateContent()
    } else {
      console.log('no model')
    }
  }

  render () {
    console.log('rendering info view')
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
    console.log('disposing info view')
    this.destroy()
  }

  destroy () {
    console.log('destroying info view')
    super.destroy()
    this.subscriptions.dispose()
  }
}
