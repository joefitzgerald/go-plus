// @flow
/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import EtchComponent from './../etch-component'

import type GodocPanel from './godoc-panel'

export default class GodocView extends EtchComponent {
  props: {model: GodocPanel}

  constructor (props: {model: GodocPanel}) {
    super(props)
    if (props.model) {
      props.model.view = this
    }
    this.props = props
  }

  render () {
    const {msg, doc, keymap} = this.props.model

    if (msg) {
      return (
        <div>
          <span className='godoc-panel' tabindex='0'>
            {msg}
          </span>
        </div>
      )
    }

    if (!doc || !doc.decl) {
      return (
        <div>
          <span className='godoc-panel' tabindex='0'>
            {`Place the cursor on a symbol and run the "golang:showdoc" command (bound to ${keymap})...`}
          </span>
        </div>
      )
    }
    let decl
    if (doc.gddo) {
      decl = (
        <a href={doc.gddo}>{doc.decl}</a>
      )
    } else {
      decl = (
        <span>{doc.decl}</span>
      )
    }

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
