/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import etch from 'etch'
import EtchComponent from './../etch-component'
import { parseGoPosition, openFile } from './../utils'

const defaultMessage = 'To find interface implementations, select a type name and run the `golang:implements` command via the command palette.'

export default class ImplementsView extends EtchComponent {
  constructor (props) {
    super(props)
    if (props.model) {
      props.model.view = this
    }
  }

  openFile (gopos) {
    const pos = parseGoPosition(gopos)
    if (!pos) {
      return
    }
    const {file, line, column = 1} = pos
    openFile(file, {row: line - 1, column: column - 1}).catch((err) => {
      console.log('could not access ' + file, err)
    })
  }

  update (props) {
    this.props = props
    return etch.update(this)
  }

  structuredContent (obj) {
    // obj.type: the query input
    // obj.to: present for implementations of a queried interface
    // obj.from: present for interfaces implemented by the queried type
    // obj.fromptr: present for interfaces implemented by pointers to the queried type
    return (
      <div style={'width: 100%;'}>
        {obj.to && obj.to.length ? this.to(obj) : null}
        {obj.from && obj.from.length ? this.from(obj) : null}
        {obj.fromptr && obj.fromptr.length ? this.fromptr(obj) : null}
      </div>
    )
  }

  to (obj) {
    return (
      <details className='go-plus-accordion-item' open>
        {this.header(obj, 'is implemented by')}
        {this.items(obj.to)}
      </details>
    )
  }

  from (obj) {
    return (
      <details className='go-plus-accordion-item' open>
        {this.header(obj, 'implements')}
        {this.items(obj.from)}
      </details>
    )
  }

  fromptr (obj) {
    return (
      <details className='go-plus-accordion-item' open>
        {this.header(obj, 'implements (by pointer)')}
        {this.items(obj.fromptr)}
      </details>
    )
  }

  header (obj, subtitle) {
    return (
      <summary className='go-plus-accordion-header'>
        <span className='text-subtle'>{obj.type.kind + ' type '}</span>
        <span onclick={() => this.openFile(obj.type.pos)}>{obj.type.name}</span>
        <span className='text-subtle'>{' ' + subtitle}</span>
      </summary>
    )
  }

  items (arr) {
    return (
      <main className='go-plus-accordian-content'>
        <table className='go-plus-table'>
          {arr.map((item) => {
            return (
              <tr onclick={this.openFile.bind(this, item.pos)} className='go-plus-table-row'>
                <td className='go-plus-table-cell go-plus-left-pad'>{item.name}<span className='text-subtle'>{' at ' + item.pos}</span></td>
              </tr>
            )
          })}
        </table>
      </main>
    )
  }

  render () {
    if (typeof this.props === 'string') {
      return <div className='padded-content'>{this.props}</div>
    }
    if (!this.props.type) {
      return <div className='padded-content'>{defaultMessage}</div>
    }
    return this.structuredContent(this.props)
  }
}
