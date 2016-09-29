/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import {CompositeDisposable} from 'atom'
import etch from 'etch'
import EtchComponent from '../etch-component'

export default class GoPlusStatusBar extends EtchComponent {
  constructor (props) {
    if (!props) {
      props = {state: 'unknown'}
    }
    super(props)
    this.subscriptions = new CompositeDisposable()
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

    let className = 'o-plus-status-bar go-plus-status-' + this.props.state + ' icon icon-diff-added inline-block'
    return (
      <span type='button' className={className} onclick={this.handleClick.bind(this)}> go-plus</span>
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
