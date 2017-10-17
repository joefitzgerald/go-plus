/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import etch from 'etch'
import EtchComponent from './../etch-component'

export default class GoPlusStatusBar extends EtchComponent {
  constructor (props) {
    if (!props) {
      props = {state: 'unknown'}
    }
    super(props)
  }

  dispose () {
    this.destroy()
  }

  handleClick () {
    if (this.props.togglePanel) {
      this.props.togglePanel()
    }
  }

  render () {
    if (!this.props.state) {
      this.props.state = 'unknown'
    }

    const className = 'o-plus-status-bar go-plus-status-' + this.props.state + ' icon icon-diff-added inline-block'
    return (
      <span type='button' className={className} on={{click: this.handleClick}}> go-plus</span>
    )
  }
}
