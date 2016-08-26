/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import {CompositeDisposable} from 'atom'
import etch from 'etch'
import EtchComponent from '../etch-component'

export default class GoPlusPanel extends EtchComponent {
  constructor (props) {
    if (!props) {
      props = {icon: 'check', state: 'unknown', testOutput: 'No test output...'}
    }
    super(props)
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.config.observe('go-plus.maxPanelHeight', (maxPanelHeight) => {
      this.maxPanelHeight = maxPanelHeight
    }))
  }

  render () {
    let output = 'No content here'
    let panelStyle = 'max-height: ' + this.maxPanelHeight + ';'
    return (
      <atom-panel className='go-plus-panel padded'>
        <div className='inset-panel'>
          <div className='panel-heading'> <span className='icon icon-diff-added'>go-plus</span>
            <nav className='panel-nav'>
              <span className='panel-nav-item'>Build</span>
              <span className='panel-nav-item is-selected'>Test</span>
              <span className='panel-nav-item'>Godoc</span>
              <span className='panel-nav-item'>Guru</span>
            </nav>
            <button className='panel-button icon icon-fold' onclick={this.handleFold.bind(this)} />
            <button className='panel-button icon icon-x' onclick={this.handleClose.bind(this)} />
          </div>
          <div ref='content' className='panel-body padded' style={panelStyle} scrollTop={this.scrollHeight} innerHTML={output} />
        </div>
      </atom-panel>
    )
  }

  readAfterUpdate () {
    let content = this.refs.content
    if (!content) {
      return
    }

    let scrollHeight = content.scrollHeight
    if (scrollHeight && this.scrollHeight !== scrollHeight) {
      this.scrollHeight = scrollHeight
      this.update()
    }
  }

  handleFold () {
    // TODO
  }

  handleClose () {
    if (this.props.toggle) {
      this.props.toggle()
    }
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
