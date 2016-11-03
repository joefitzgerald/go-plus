/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import {CompositeDisposable} from 'atom'
import etch from 'etch'
import EtchComponent from './etch-component'
import EmptyTabView from './empty-tab-view'
import Octicon from 'etch-octicon'

export default class GoPlusPanel extends EtchComponent {
  constructor (props) {
    console.log('constructing panel')
    super(props)
    this.subscriptions = new CompositeDisposable()
  }

  render () {
    console.log('rendering panel')
    let panelStyle = {
      'min-height': this.props.model.minPanelHeight,
      'max-height': this.props.model.maxPanelHeight,
      height: this.props.model.currentPanelHeight
    }
    let panelBodyStyle = {
      'font-family': atom.config.get('editor.fontFamily'),
      'font-size': atom.config.get('editor.fontSize') + 'px',
      'line-height': atom.config.get('editor.lineHeight')
    }
    if (this.props.resizeToFit) {
      panelStyle = {
        'min-height': '1px',
        'max-height': this.props.model.maxPanelHeight,
        height: '1px'
      }

      panelBodyStyle.height = '1px'
    }

    // TODO: update godoc to use the below approach too
    let tabs = [
      {key: 'reference', packageName: 'godoc', name: 'Reference', icon: 'book', order: 300}
    ]

    let ActiveView
    let activeModel
    let packageName = 'unknown'
    let activeRef = this.props.model.activeItem + 'view'
    this.props.model.viewProviders.forEach(({ view, model }) => {
      if (this.props.model.activeItem === model.key) {
        ActiveView = view
        activeModel = model
        if (model && model.isActive) {
          model.isActive(true)
        }
      } else {
        if (model && model.isActive) {
          model.isActive(false)
        }
      }
      if (tabs.find(({ key }) => key === model.key)) {
        return
      }
      tabs.push(Object.assign({ key: model.key, order: 999, icon: 'question', packageName: 'unknown' }, model.tab))
    })
    if (!ActiveView || !activeModel) {
      ActiveView = EmptyTabView
    }

    tabs = tabs.map((item) => {
      item.className = 'panel-nav-item'
      if (this.props.model.activeItem === item.key) {
        item.className = item.className + ' is-selected'
      }
      return item
    }).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))

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
        <div ref='panelbody' className='panel-body native-key-bindings' tabIndex='0' style={panelBodyStyle}>
          <ActiveView ref={activeRef} model={activeModel} packageName={packageName} />
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

  handleTabClick (item) {
    console.log('tab click: ' + item.key + ' / active: ' + this.props.model.activeItem)

    if (item && item.key && item.key.length && this.props.model.activeItem !== item.key) {
      this.props.model.activeItem = item.key
      this.update()
    }
  }

  handleFold () {
    // TODO
  }

  handleClose () {
    if (this.props.model.togglePanel) {
      this.props.model.togglePanel()
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
    if (this.subscriptions != null) {
      this.subscriptions.dispose()
    }

    let mouseUpHandler = (e) => this.handleMouseUp(e)
    let mouseMoveHandler = (e) => this.handleMouseMove(e)
    window.addEventListener('mousemove', mouseMoveHandler)
    window.addEventListener('mouseup', mouseUpHandler)

    this.subscriptions = new CompositeDisposable(
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
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
  }

  dispose () {
    console.log('disposing panel')
    this.destroy()
  }

  destroy () {
    console.log('destroying panel')
    super.destroy()
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
  }
}
