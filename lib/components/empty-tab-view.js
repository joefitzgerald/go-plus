/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import {CompositeDisposable} from 'atom'
import etch from 'etch'
import EtchComponent from './etch-component'
import Octicon from 'etch-octicon'

export default class EmptyTabView extends EtchComponent {
  constructor (props) {
    console.log('constructing empty tab view')
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
          <Octicon name='issue-opened' className='auto-size' />
          The {this.props.packageName} package must be installed and enabled to use this tab
          <br />
          <br />
          You may also want to ensure you have updated all packages.
        </span>
      </div>
    )
  }

  dispose () {
    console.log('disposing empty tab view')
    this.destroy()
  }

  destroy () {
    console.log('destroying empty tab view')
    super.destroy()
    this.subscriptions.dispose()
  }
}
