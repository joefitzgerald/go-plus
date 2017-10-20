/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import etch from 'etch'
import EtchComponent from './../etch-component'
import Octicon from 'etch-octicon'

export default class EmptyTabView extends EtchComponent {
  render () {
    return (
      <div className='go-plus-empty-tab'>
        <span className='text-subtle'>
          <Octicon name='issue-opened' className='auto-size' />
          {'The go-plus panel is active when a Go project is loaded.'}
          <br />
          {'Open a .go file to get started.'}
        </span>
      </div>
    )
  }
}
