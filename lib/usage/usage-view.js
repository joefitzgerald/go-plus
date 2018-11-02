// @flow
/** @jsx etch.dom */

import { CompositeDisposable } from 'atom'
import etch from 'etch'
import EtchComponent from './../etch-component'
import Octicon from 'etch-octicon'
import { openFile } from './../utils'

import type { Reference } from './usage'

const defaultContent = 'To find usage, select an identifier and run the `golang:find-usages` command via the command palette.'

export default class UsageView extends EtchComponent {
  props: {
    content?: string | { raw: string, referrers: Map<string, Array<Reference>>},
    model?: any,
    style?: string,
  }
  subscriptions: CompositeDisposable

  constructor (props: Object) {
    super(props)
    this.subscriptions = new CompositeDisposable()
    if (props.model) {
      props.model.view = this
    }
  }

  render () {
    let style = 'white-space: pre-wrap; width: 100%;'
    if (this.props.style) {
      style = style + ' ' + this.props.style
    }
    const packs = []
    if (this.props.content && this.props.content.referrers instanceof Map) {
      packs.push(...this.props.content.referrers.entries())
    }
    if (packs.length) {
      return this.structuredContent(style, packs)
    } else {
      return this.rawContent(style)
    }
  }

  structuredContent (style: string, packs: Array<[string, Array<Reference>]>) {
    const dirs = atom.project.getDirectories()
    /* eslint-disable react/no-string-refs */
    /* eslint-disable react/jsx-key */
    return (
      <div ref='content' style={style} tabIndex='-1'>
        {packs.map(([pkg, refs]) => {
          return (
            <details className='go-plus-accordion-item' open>
              <summary className='go-plus-accordion-header'><Octicon name='package' /> {pkg} <span className='badge badge-info'>{refs.length}</span></summary>
              <main className='go-plus-accordion-content'>
                <table className='go-plus-table'>
                  {refs.map((ref) => {
                    let { filename } = ref
                    if (dirs.length) {
                      filename = dirs[0].relativize(filename)
                    }
                    return (
                      <tr onClick={this.handleClick.bind(this, ref)} className='go-plus-table-row'>
                        <td className='go-plus-table-cell'>{ref.text.trim()} <span className='text-subtle'>at {filename}:{ref.row}:{ref.column}</span></td>
                      </tr>
                    )
                  })}
                </table>
              </main>
            </details>
          )
        })}
      </div>
    )
    /* eslint-enable react/no-string-refs */
  }

  rawContent (style: string) {
    const content = this.props.content || defaultContent
    /* eslint-disable react/no-string-refs */
    return (
      <div className='padded-content'>
        <span ref='content' style={style} tabIndex='-1'>
          {content}
        </span>
      </div>
    )
    /* eslint-enable react/no-string-refs */
  }

  handleClick (ref: Reference) {
    const row = ref.row || 1
    const column = ref.column || 1
    openFile(ref.filename, { row: row - 1, column: column - 1 }).catch((err) => {
      console.log('could not access ' + ref.filename, err)  // eslint-disable-line no-console
    })
  }

  dispose () {
    this.destroy()
  }

  destroy () {
    super.destroy()
    this.subscriptions.dispose()
  }
}
