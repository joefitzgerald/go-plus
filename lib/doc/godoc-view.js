/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import EtchComponent from './../etch-component'

export default class GodocView extends EtchComponent {
  constructor (props) {
    super(props)
    if (props.model) {
      props.model.view = this
    }
    this.props = props
  }

  render () {
    const doc = this.props.model.doc
    const keymap = this.props.model.keymap

    if (!doc) {
      return (
        <div>
          <span className='godoc-panel' tabindex='0'>
            {`Place the cursor on a symbol and run the "golang:showdoc" command (bound to ${keymap})...`}
          </span>
        </div>
      )
    }
    const decl = doc.gddo
      ? <a href={doc.gddo}>{doc.decl}</a>
      : <span>{doc.decl}</span>

    return (
      <div tabindex='0' className='godoc-panel'>
        {doc.import && doc.import.length &&
          <div>
            <span>{`import "${doc.import}"`}</span>
            <br /><br />
          </div>
        }
        {decl}
        <br /><br />
        <span>{doc.doc}</span>
      </div>
    )
  }
}
