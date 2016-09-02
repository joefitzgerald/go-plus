/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import {CompositeDisposable, Disposable} from 'atom'
import etch from 'etch'
import EtchComponent from '../etch-component'

export default class GoPlusPanel extends EtchComponent {
  constructor (props) {
    let defaults = {
      activeItem: 'go'
    }
    props = Object.assign({}, defaults, props)

    props.viewProviders = new Map()
    super(props)
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.config.observe('go-plus.maxPanelHeight', (maxPanelHeight) => {
      this.maxPanelHeight = maxPanelHeight
      this.update()
    }))
    this.subscriptions.add(atom.config.observe('go-plus.minPanelHeight', (minPanelHeight) => {
      this.minPanelHeight = minPanelHeight
      this.update()
    }))
    this.subscriptions.add(atom.config.observe('go-plus.currentPanelHeight', (currentPanelHeight) => {
      this.currentPanelHeight = currentPanelHeight
      this.update()
    }))
    this.resizeSubscriptions = new CompositeDisposable()
  }

  render () {
    let panelStyle = {
      'min-height': this.minPanelHeight,
      'max-height': this.maxPanelHeight,
      height: this.currentPanelHeight
    }
    let tabs = [
      {key: 'go', name: 'Go', icon: 'info', order: 100},
      {key: 'build', name: 'Build', icon: 'tools', order: 200},
      {key: 'test', name: 'Test', icon: 'check', order: 300},
      {key: 'messages', name: 'Messages', icon: 'list-unordered', order: 400},
      {key: 'reference', name: 'Reference', icon: 'book', order: 500},
      {key: 'guru', name: 'Guru', icon: 'microscope', order: 600},
      {key: 'debug', name: 'Debug', icon: 'bug', order: 700},
      {key: 'settings', name: 'Settings', icon: 'gear', order: 800}
    ].map((item) => {
      item.className = 'panel-nav-item icon icon-' + item.icon
      if (this.props.activeItem === item.key) {
        item.className = item.className + ' is-selected'
      }
      return item
    }).sort((a, b) => a.order - b.order)
    return (
      <atom-panel ref='thepanel' className='go-plus-panel' style={panelStyle}>
        <div ref='resizehandle' className='go-plus-panel-resize-handle' onmousedown={this.handleMouseDown.bind(this)} />
        <div className='panel-heading'>
          <div className='panel-group'>
            <span className='icon icon-diff-added'>go-plus</span>
          </div>
          <nav className='panel-group panel-nav'>
            {tabs.map((item) => {
              let tabKey = item.key + '-tab'
              return <span key={tabKey} className={item.className} onclick={this.handleTabClick.bind(this, item)}>{item.name}</span>
            })}
          </nav>
          <div className='panel-group'>
            <button className='panel-icon-button icon icon-fold' onclick={this.handleFold.bind(this)} />
            <button className='panel-icon-button icon icon-x' onclick={this.handleClose.bind(this)} />
          </div>
        </div>
        {tabs.map((item) => {
          let key = item.key
          if (this.props.activeItem !== key) {
            return
          }
          if (this.props.viewProviders.has(key)) {
            let {view, model} = this.props.viewProviders.get(key)
            let elementKey = key + '-view'
            let View = view
            return (
              <div ref='panelbody' className='panel-body'>
                <View ref={elementKey} model={model} />
              </div>
            )
          } else {
            return (
              <div className='panel-body native-key-bindings' tabIndex='-1' style={panelStyle}>
                <ul className='background-message centered'>
                  <li>No Results</li>
                </ul>
              </div>
            )
          }
        })}
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

  handleMouseDown (e) {
    if (this.resizeSubscriptions != null) {
      this.resizeSubscriptions.dispose()
    }

    let mouseUpHandler = (e) => this.handleMouseUp(e)
    let mouseMoveHandler = (e) => this.handleMouseMove(e)
    window.addEventListener('mousemove', mouseMoveHandler)
    window.addEventListener('mouseup', mouseUpHandler)

    this.resizeSubscriptions = new CompositeDisposable(
      {dispose: () => { window.removeEventListener('mousemove', mouseMoveHandler) }},
      {dispose: () => { window.removeEventListener('mouseup', mouseUpHandler) }}
    )
  }

  handleMouseMove (e) {
    let height = this.refs.thepanel.getBoundingClientRect().bottom - e.pageY
    let vheight = window.innerHeight
    let vh = (height / vheight) * 100 + 'vh'
    atom.config.set('go-plus.currentPanelHeight', vh)
  }

  handleMouseUp (e) {
    if (this.resizeSubscriptions) {
      this.resizeSubscriptions.dispose()
    }
  }

  registerViewProvider (view, model) {
    if (!view || !model || !model.key) {
      return new Disposable()
    }
    let key = model.key
    this.props.viewProviders.set(key, {view, model})
    this.update()
    return new Disposable(() => {
      this.props.viewProviders.delete(key)
    })
  }

  dispose () {
    this.destroy()
  }

  destroy () {
    super.destroy()
    this.subscriptions.dispose()
    if (this.viewProviders) {
      this.viewProviders.clear()
    }
    if (this.resizeSubscriptions) {
      this.resizeSubscriptions.dispose()
    }
    this.resizeSubscriptions = null
    this.viewProviders = null
  }
}
