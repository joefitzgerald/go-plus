/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import {CompositeDisposable} from 'atom'
import etch from 'etch'
import EtchComponent from '../etch-component'

export default class GoInformation extends EtchComponent {
  constructor (props) {
    super(props)
    this.subscriptions = new CompositeDisposable()
  }

  render () {
    let content = 'go version go1.7 darwin/amd64'
    return (
      <div ref='content' className='panel-body padded'>{content}</div>
    )
  }

  dispose () {
    this.destroy()
  }

  destroy () {
    super.destroy()
    this.subscriptions.dispose()
    this.ansi = null
  }
}
