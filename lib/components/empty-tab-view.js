/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import {CompositeDisposable} from 'atom'
import etch from 'etch'
import EtchComponent from '../etch-component'
import path from 'path'
import Octicon from 'etch-octicon'

export default class EmptyTabView extends EtchComponent {
  constructor (props) {
    if (!props.packageName) {
      throw new Error('You must supply a packageName to use the EmptyTabView')
    }
    super(props)
    this.subscriptions = new CompositeDisposable()
  }

  render () {
    return (
      <div className='go-plus-empty-tab'>
        <span className='text-subtle'>
          <Octicon name='issue-opened' mega />
          The {this.props.packageName} package must be installed and enabled to use this tab...
        </span>
      </div>
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
