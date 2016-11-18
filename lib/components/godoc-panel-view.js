/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

export default class GodocPanelView {
  constructor (props) {
    if (props.model) {
      props.model.view = this
    }

    this.props = props

    etch.initialize(this)
    etch.setScheduler(atom.views)
  }

  update (props) {
    let oldProps = this.props
    this.props = Object.assign({}, oldProps, props)
    return etch.update(this)
  }

  dispose () {
    this.destroy()
  }

  destroy () {
    etch.destroy(this)
  }

  render () {
    return (
      <div>
        <span tabindex='0' className='godoc-panel'>{this.props.model.doc}</span>
      </div>
    )
  }
}
