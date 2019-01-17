// @flow
/** @jsx etch.dom */
/* eslint-disable react/display-name */

import etch from 'etch' // eslint-disable-line
import { EtchComponent } from './etch-component'
import parser from 'ansi-style-parser'

export class AnsiStyle extends EtchComponent {
  props: { text?: string, mapText?: string => any }

  constructor(props: Object) {
    props = props || {}
    super(props)
  }

  render() {
    const text = this.props.text || ''
    const map = this.props.mapText || (text => <span>{text}</span>)

    return (
      <div className="go-plus-panel-pre">
        {parser(text).map((chunk, i) => {
          const classes = chunk.styles
            .map(style => 'go-plus-ansi-' + style)
            .join(' ')
          return (
            <span className={classes} key={i}>
              {map(chunk.text)}
            </span>
          )
        })}
      </div>
    )
  }
}
