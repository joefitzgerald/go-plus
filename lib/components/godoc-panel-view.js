/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import EtchComponent from './etch-component'

export default class GodocPanelView extends EtchComponent {
  constructor (props) {
    super(props)
    if (props.model) {
      props.model.view = this
    }
    this.props = props
  }

  render () {
    return (
      <div>
        <span tabindex='0' className='godoc-panel'>{this.props.model.doc}</span>
      </div>
    )
  }
}
