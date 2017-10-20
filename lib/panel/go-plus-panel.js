/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import etch from 'etch'
import ResizeObserver from 'resize-observer-polyfill'
import EtchComponent from './../etch-component'
import EmptyTabView from './empty-tab-view'
import Octicon from 'etch-octicon'

export default class GoPlusPanel extends EtchComponent {
  constructor (props) {
    super(props)
    this.ro = new ResizeObserver((entries, observer) => {
      for (const entry of entries) {
        const {width} = entry.contentRect
        const narrow = width < 600
        if (this.isNarrow !== narrow) {
          this.isNarrow = narrow
          this.update()
        }
      }
    })
    this.ro.observe(this.element)
  }

  render () {
    const panelBodyStyle = {
      'font-family': atom.config.get('editor.fontFamily'),
      'font-size': atom.config.get('go-plus.panel.fontSize'),
      'line-height': atom.config.get('editor.lineHeight'),
      'padding': '10px'
    }

    let panelClass = 'go-plus-panel'
    if (this.isNarrow) {
      panelClass += ' is-narrow'
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
      <div ref='thepanel' className={panelClass}>
        <div className='panel-heading'>
          <nav className='panel-group panel-nav'>
            {tabs.map((item) => {
              const tabKey = item.key + '-tab'
              return (
                <span key={tabKey} className={item.className} on={{click: () => this.handleTabClick(item)}}>
                  <Octicon name={item.icon} />
                  <span className='panel-nav-label'>{item.name}</span>
                </span>
              )
            })}
          </nav>
        </div>
        <div ref='panelbody' className='go-plus-panel-body panel-body native-key-bindings' tabIndex='0' style={panelBodyStyle}>
          <ActiveView ref={activeRef} model={activeModel} packageName={packageName} />
        </div>
      </div>
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

  dispose () {
    this.destroy()
  }

  destroy () {
    this.ro.unobserve(this.element)
    this.ro = null
    super.destroy(true)
  }
}

export const PANEL_URI = 'atom://go-plus/panel'
