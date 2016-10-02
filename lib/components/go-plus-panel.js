/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import {CompositeDisposable, Disposable} from 'atom'
import etch from 'etch'
import EtchComponent from '../etch-component'
import EmptyTabView from './empty-tab-view'
import Octicon from 'etch-octicon'

export default class GoPlusPanel extends EtchComponent {
  constructor (props) {
    let defaults = {
      activeItem: 'go'
    }
    props = Object.assign({}, defaults, props)

    props.viewProviders = new Map()
    super(props)
    this.subscriptions = new CompositeDisposable()
    this.resizeSubscriptions = new CompositeDisposable()
    this.subscribeToConfig()
  }

  subscribeToConfig () {
    this.subscriptions.add(atom.config.observe('editor.fontFamily', (v) => {
      this.update()
    }))
    this.subscriptions.add(atom.config.observe('editor.fontSize', (v) => {
      this.update()
    }))
    this.subscriptions.add(atom.config.observe('editor.lineHeight', (v) => {
      this.update()
    }))
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
  }

  render () {
    let panelStyle = {
      'min-height': this.minPanelHeight,
      'max-height': this.maxPanelHeight,
      height: this.currentPanelHeight
    }
    let panelBodyStyle = {
      'font-family': atom.config.get('editor.fontFamily'),
      'font-size': atom.config.get('editor.fontSize') + 'px',
      'line-height': atom.config.get('editor.lineHeight')
    }
    if (this.props.resizeToFit) {
      panelStyle = {
        'min-height': '1px',
        'max-height': this.maxPanelHeight,
        height: '1px'
      }

      panelBodyStyle.height = '1px'
    }
    let tabs = [
      {key: 'go', packageName: 'go-plus', name: 'Go', icon: 'info', order: 100},
      {key: 'test', packageName: 'tester-go', name: 'Test', icon: 'check', order: 200},
      {key: 'reference', packageName: 'godoc', name: 'Reference', icon: 'book', order: 300}
    ].map((item) => {
      item.className = 'panel-nav-item'
      if (this.props.activeItem === item.key) {
        item.className = item.className + ' is-selected'
      }
      return item
    }).sort((a, b) => a.order - b.order)
    let that = this
    return (
      <atom-panel ref='thepanel' className='go-plus-panel' style={panelStyle}>
        <div ref='resizehandle' className='go-plus-panel-resize-handle' onmousedown={this.handleMouseDown.bind(this)} ondblclick={this.handleDoubleClick.bind(this)} />
        <div className='panel-heading'>
          <div className='panel-group'>
            <Octicon name='diff-added' /> go-plus
          </div>
          <nav className='panel-group panel-nav'>
            {tabs.map((item) => {
              let tabKey = item.key + '-tab'
              return <span key={tabKey} className={item.className} onclick={this.handleTabClick.bind(this, item)}><Octicon name={item.icon} /> {item.name}</span>
            })}
          </nav>
          <div className='panel-group'>
            <button className='panel-icon-button' onclick={this.handleFold.bind(this)}><Octicon name='fold' /></button>
            <button className='panel-icon-button' onclick={this.handleClose.bind(this)}><Octicon name='x' /></button>
          </div>
        </div>
        {tabs.map((item) => {
          let key = item.key
          let active = (that.props.isVisible() && that.props.activeItem === key)
          let view
          let model
          if (that.props.viewProviders.has(key)) {
            let provider = that.props.viewProviders.get(key)
            view = provider.view
            model = provider.model
            if (model && model.isActive) {
              model.isActive(active)
            }
          }
          if (!active) {
            return
          }

          let View
          if (view) {
            View = view
          } else {
            View = EmptyTabView
          }

          let elementKey = key + '-view'

          return (
            <div ref='panelbody' className='panel-body native-key-bindings' tabIndex='0' style={panelBodyStyle}>
              <View ref={elementKey} model={model} packageName={item.packageName} />
            </div>
          )
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
    if (this.props.togglePanel) {
      this.props.togglePanel()
    }
  }

  handleDoubleClick (e) {
    let tabHeight = this.refs.panelbody.getBoundingClientRect().top - this.refs.thepanel.getBoundingClientRect().top
    this.updateSync({resizeToFit: true})
    this.props.resizeToFit = false
    let height = 0
    height = this.refs.panelbody.scrollHeight
    let vh = ((height + tabHeight) / window.innerHeight) * 100 + 'vh'
    atom.config.set('go-plus.currentPanelHeight', vh)
    this.update()
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
    model.requestFocus = () => {
      this.props.activeItem = key
      if (this.props.showPanel) {
        this.props.showPanel()
      }
      this.update()
    }
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
