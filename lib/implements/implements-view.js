/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import etch from 'etch'
import EtchComponent from './../etch-component'
import { openFile } from './../utils'

export default class ImplementsView extends EtchComponent {
  constructor (props) {
    super(props)
    if (props.model) {
      props.model.view = this
    }
  }

  openFile (gopos) {
    console.log('open', gopos)
    // openFile(filename, {row: row - 1, column: column - 1}).catch((err) => {
    //   console.log('could not access ' + filename, err)
    // })
  }

  update (props) {
    super.update(props)
  }

  structuredContent (obj) {
    // obj.type: name, pos, kind (interface or struct)
    // obj.to: implementations of the interface
    // obj.from: interfaces implemented by this type
    // obj.fromptr: interfaces implemented by pointers of this type
    return (
      <div style={'width: 100%;'}>
        <details className='go-plus-accordion-item' open>
          <summary
            className='go-plus-accordion-header'
            onclick={() => openFile(obj.type.pos)}>
            {obj.type.name}
          </summary>
          <main className='go-plus-accordion-content'>
            <span>nothing to see here</span>
          </main>
        </details>
      </div>
    )
  }

  render () {
    if (!this.props.type) {
      return <div>loading</div>
    }
    return this.structuredContent(this.props)
  }
}
