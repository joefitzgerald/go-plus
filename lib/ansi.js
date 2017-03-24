/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import etch from 'etch'
import EtchComponent from './etch-component'
import parser from 'ansi-style-parser'

export default class AnsiStyle extends EtchComponent {
  constructor (props) {
    props = props || {}
    super(props)
  }

  render () {
    const text = this.props.text || ''

    return (
      <div className='go-plus-panel-pre'>
        {
          parser(text).map((chunk, i) => {
            const classes = chunk.styles.map(style => 'go-plus-ansi-' + style).join(' ')
            return <span className={classes} key={i}>{chunk.text}</span>
          })
        }
      </div>
    )

    // return (
    //   <div className='go-plus-panel-pre'>
    //     { parser(text).map((chunk, i) => {
    //       console.log('chunk is', chunk)
    //       // return <span key={i}>{chunk.text}</span>
    //
    //       // convert newlines to <br>
    //       const lines = chunk.text.split('\n')
    //       if (lines.length === 1) {
    //         return <span key={i}>{chunk.text}</span>
    //       }
    //       return chunk.text.split('\n').map((item, j) => {
    //         return <span key={i.toString() + '-' + j.toString()}>{item}<br /></span>
    //       })
    //     }
    //   )}
    //   </div>
    // )
  }
}
