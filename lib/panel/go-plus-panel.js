/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import {CompositeDisposable} from 'atom'
import etch from 'etch'
import EtchComponent from './../etch-component'
import EmptyTabView from './empty-tab-view'
import Octicon from 'etch-octicon'

export default class GoPlusPanel extends EtchComponent {
  constructor (props) {
    super(props)
    this.subscriptions = new CompositeDisposable()
  }

  render () {
    const panelBodyStyle = {
      'font-family': atom.config.get('editor.fontFamily'),
      'font-size': atom.config.get('go-plus.panelFontSize'),
      'line-height': atom.config.get('editor.lineHeight'),
      'padding': '10px'
    }
    let panelStyle
    let orientationButtonName
    if (this.props.model.panelOrientation === 'vertical') {
      orientationButtonName = 'arrow-down'
      if (this.props.resizeToFit) {
        panelStyle = {
          'min-width': '1px',
          'max-width': this.props.model.maxPanelWidth,
          width: '1px'
        }

        panelBodyStyle.width = '1px'
      } else {
        panelStyle = {
          'min-width': this.props.model.minPanelWidth,
          'max-width': this.props.model.maxPanelWidth,
          width: this.props.model.currentPanelWidth
        }
        panelBodyStyle.width = this.props.model.currentPanelWidth
      }
    } else {
      orientationButtonName = 'arrow-right'
      if (this.props.resizeToFit) {
        panelStyle = {
          'min-height': '1px',
          'max-height': this.props.model.maxPanelHeight,
          height: '1px'
        }

        panelBodyStyle.height = '1px'
      } else {
        panelStyle = {
          'min-height': this.props.model.minPanelHeight,
          'max-height': this.props.model.maxPanelHeight,
          height: this.props.model.currentPanelHeight
        }
      }
    }

    let panelClass = 'go-plus-panel'
    if (this.props.model.panelOrientation === 'vertical') {
      panelClass = 'go-plus-panel is-vertical'
    }

    let tabs = []
    let ActiveView
    let activeModel
    let packageName = 'unknown'
    const activeRef = this.props.model.activeItem + 'view'
    this.props.model.viewProviders.forEach(({ view, model }) => {
      if (this.props.model.activeItem === model.key) {
        ActiveView = view
        activeModel = model
        if (model && model.isActive) {
          model.isActive(true)
        }
        if (model && model.setOrientation) {
          model.setOrientation(this.props.model.panelOrientation)
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

    if (activeModel && activeModel.tab && activeModel.tab.suppressPadding) {
      panelBodyStyle.padding = '0px'
    }

    tabs = tabs.map((item) => {
      item.className = 'panel-nav-item'
      if (this.props.model.activeItem === item.key) {
        item.className = item.className + ' is-selected'
      }
      return item
    }).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))

    return (
      <atom-panel ref='thepanel' className={panelClass} style={panelStyle}>
        <div ref='resizehandle' className='go-plus-panel-resize-handle' onmousedown={this.handleMouseDown.bind(this)} ondblclick={this.handleDoubleClick.bind(this)} />
        <div className='panel-heading'>
          <div className='panel-group panel-logo'>
            <Octicon name='diff-added' /> go-plus
          </div>
          <nav className='panel-group panel-nav'>
            {tabs.map((item) => {
              const tabKey = item.key + '-tab'
              return <span key={tabKey} className={item.className} onclick={this.handleTabClick.bind(this, item)}><Octicon name={item.icon} /> <span className='panel-nav-label'>{item.name}</span></span>
            })}
          </nav>
          <div className='panel-group'>
            <button className='panel-icon-button' onclick={this.handleToggleOrientation.bind(this)}><Octicon name={orientationButtonName} /></button>
            <button className='panel-icon-button' onclick={this.handleClose.bind(this)}><Octicon name='x' /></button>
          </div>
        </div>
        <div ref='panelbody' className='go-plus-panel-body panel-body native-key-bindings' tabIndex='0' style={panelBodyStyle}>
          <ActiveView ref={activeRef} model={activeModel} packageName={packageName} />
        </div>
      </atom-panel>
    )
  }

  readAfterUpdate () {
    const content = this.refs.content
    if (!content) {
      return
    }

    const scrollHeight = content.scrollHeight
    if (scrollHeight && this.scrollHeight !== scrollHeight) {
      this.scrollHeight = scrollHeight
      this.update()
    }
  }

  handleTabClick (item) {
    if (item && item.key && item.key.length && this.props.model.activeItem !== item.key) {
      this.props.model.activeItem = item.key
      this.update()
    }
  }

  handleFold () {
    // TODO
  }

  handleToggleOrientation () {
    if (this.props.model.panelOrientation === 'vertical') {
      atom.config.set('go-plus.panelOrientation', 'horizontal')
    } else {
      atom.config.set('go-plus.panelOrientation', 'vertical')
    }
  }

  handleClose () {
    if (this.props.model.togglePanel) {
      this.props.model.togglePanel()
    }
  }

  handleDoubleClick (e) {
    if (this.props.model.panelOrientation === 'vertical') {
      return
    }

    const tabHeight = this.refs.panelbody.getBoundingClientRect().top - this.refs.thepanel.getBoundingClientRect().top
    this.updateSync({resizeToFit: true})
    this.props.resizeToFit = false
    let height = 0
    height = this.refs.panelbody.scrollHeight
    const vh = (((height + tabHeight) / window.innerHeight) * 100) + 'vh'
    atom.config.set('go-plus.currentPanelHeight', vh)
    this.update()
  }

  handleMouseDown (e) {
    if (this.subscriptions != null) {
      this.subscriptions.dispose()
    }

    const mouseUpHandler = (e) => this.handleMouseUp(e)
    const mouseMoveHandler = (e) => this.handleMouseMove(e)
    window.addEventListener('mousemove', mouseMoveHandler)
    window.addEventListener('mouseup', mouseUpHandler)

    this.subscriptions = new CompositeDisposable(
      {dispose: () => { window.removeEventListener('mousemove', mouseMoveHandler) }},
      {dispose: () => { window.removeEventListener('mouseup', mouseUpHandler) }}
    )
  }

  handleMouseMove (e) {
    if (this.props.model.panelOrientation === 'vertical') {
      const width = this.refs.thepanel.getBoundingClientRect().right - e.pageX
      const vwidth = window.innerWidth
      const vw = ((width / vwidth) * 100) + 'vw'
      atom.config.set('go-plus.currentPanelWidth', vw)
    } else {
      const height = this.refs.thepanel.getBoundingClientRect().bottom - e.pageY
      const vheight = window.innerHeight
      const vh = ((height / vheight) * 100) + 'vh'
      atom.config.set('go-plus.currentPanelHeight', vh)
    }
  }

  handleMouseUp (e) {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
  }

  dispose () {
    this.destroy()
  }

  destroy () {
    super.destroy(true)
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
  }
}
