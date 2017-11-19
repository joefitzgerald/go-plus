// @flow
/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import etch from 'etch'
import EtchComponent from './../etch-component'

import type {Information} from './information'

type Props = {
  model?: Information,
  style?: string,
  content: string
}

export default class InformationView extends EtchComponent {
  props: Props

  constructor (props: Props) {
    if (!props.content) {
      props.content = 'empty'
    }
    super(props)
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
}
