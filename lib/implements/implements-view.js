// @flow
/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import etch from 'etch'
import EtchComponent from './../etch-component'
import {parseGoPosition, openFile} from './../utils'

import type {Implements} from './implements'
import type {GoPos} from './../utils'

const defaultMessage = 'To find interface implementations, select a type name and run the `golang:implements` command via the command palette.'

type ImplementsType = {
  name: string,
  pos: string,
  kind: string
}

type GuruImplementsResult = {
  type: ImplementsType,
  to?: Array<ImplementsType>,
  from?: Array<ImplementsType>,
  fromptr?: Array<ImplementsType>
}

class ImplementsView extends EtchComponent {
  props: string | GuruImplementsResult

  constructor (props: {model?: Implements}) {
    super(props)
    if (props.model) {
      props.model.view = this
    }
  }

  openFile (gopos: string) {
    const pos: GoPos = parseGoPosition(gopos)
    if (!pos) {
      return
    }

    const {file, line = 1, column = 1} = pos
    openFile(file, {row: line - 1, column: column - 1}).catch((err) => {
      console.log('could not access ' + file, err)
    })
  }

  update (props: any) {
    this.props = props
    return etch.update(this)
  }

  structuredContent (obj: GuruImplementsResult) {
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

  to (obj: GuruImplementsResult) {
    return (
      <details className='go-plus-accordion-item' open>
        {this.header(obj, 'is implemented by')}
        {obj.to ? this.items(obj.to) : undefined}
      </details>
    )
  }

  from (obj: GuruImplementsResult) {
    return (
      <details className='go-plus-accordion-item' open>
        {this.header(obj, 'implements')}
        {obj.from ? this.items(obj.from) : undefined}
      </details>
    )
  }

  fromptr (obj: GuruImplementsResult) {
    return (
      <details className='go-plus-accordion-item' open>
        {this.header(obj, 'implements (by pointer)')}
        {obj.fromptr ? this.items(obj.fromptr) : undefined}
      </details>
    )
  }

  header (obj: GuruImplementsResult, subtitle: string) {
    return (
      <summary className='go-plus-accordion-header'>
        <span className='text-subtle'>{obj.type.kind + ' type '}</span>
        <span onclick={() => this.openFile(obj.type.pos)}>{obj.type.name}</span>
        <span className='text-subtle'>{' ' + subtitle}</span>
      </summary>
    )
  }

  items (arr: Array<ImplementsType>) {
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

export {ImplementsView}
