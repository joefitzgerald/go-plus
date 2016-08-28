/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import {CompositeDisposable} from 'atom'
import etch from 'etch'
import EtchComponent from '../etch-component'
import GoInformation from '../components/go-information'

export default class GoPlusPanel extends EtchComponent {
  constructor (props) {
    if (!props) {
      props = {activeItem: 'go', icon: 'check', state: 'unknown', testOutput: 'No test output...'}
    }
    if (!props.activeItem) {
      props.activeItem = 'go'
    }
    props.viewProviders = [new GoInformation()]
    super(props)
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.config.observe('go-plus.maxPanelHeight', (maxPanelHeight) => {
      this.maxPanelHeight = maxPanelHeight
    }))
  }

  render () {
    let output = 'No content here'
    let panelStyle = 'max-height: ' + this.maxPanelHeight + ';'
    let tabs = [
      {key: 'go', name: 'Go', icon: 'info', order: 100},
      {key: 'build', name: 'Build', icon: 'tools', order: 200},
      {key: 'test', name: 'Test', icon: 'check', order: 300},
      {key: 'debug', name: 'Debug', icon: 'bug', order: 400},
      {key: 'messages', name: 'Messages', icon: 'list-unordered', order: 500},
      {key: 'reference', name: 'Reference', icon: 'book', order: 600},
      {key: 'guru', name: 'Guru', icon: 'microscope', order: 700},
      {key: 'settings', name: 'Settings', icon: 'gear', order: 800}
    ].map((item) => {
      item.className = 'panel-nav-item icon icon-' + item.icon
      if (this.props.activeItem === item.key) {
        item.className = item.className + ' is-selected'
      }
      return item
    }).sort((a, b) => a.order - b.order)
    console.log(tabs)
    return (
      <atom-panel className='go-plus-panel'>
        <div className='panel-heading'>
          <div className='panel-group'>
            <span className='icon icon-diff-added'>go-plus</span>
          </div>
          <nav className='panel-group panel-nav'>
            {tabs.map((item) => {
              return <span key={item.key} className={item.className} onclick={this.handleTabClick.bind(this, item)}>{item.name}</span>
            })}
          </nav>
          <div className='panel-group'>
            <button className='panel-icon-button icon icon-fold' onclick={this.handleFold.bind(this)} />
            <button className='panel-icon-button icon icon-x' onclick={this.handleClose.bind(this)} />
          </div>
        </div>
        {this.props.viewProviders.map((view) => view)}
        // <div ref='content' className='panel-body padded' style={panelStyle} scrollTop={this.scrollHeight} innerHTML={output} />
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

  handleTabClick (item) {
    if (item && item.key && item.key.length && this.props.activeItem !== item.key) {
      this.props.activeItem = item.key
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
