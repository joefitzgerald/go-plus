/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import etch from 'etch'
import EtchComponent from './etch-component'

export default class FileLink extends EtchComponent {
  constructor (props) {
    props = props || {}
    super(props)
  }

  render () {
    const text = this.props.text || ''
    return (
      <span>{this.buildElements(text)}</span>
    )
  }

  buildElements (text) {
    const elements = []
    let lastIndex = 0

    let match
    if (this.props.locationRegex) {
      do {
        match = this.props.locationRegex.exec(text)
        if (match && match.index) {
          // take raw text up to this match
          elements.push(<span>{text.slice(lastIndex, match.index)}</span>)

          const linkText = match[0]
          // convert the match to a link
          elements.push(<a onclick={() => this.props.linkClicked(linkText)}>{linkText}</a>)
          lastIndex = match.index + match[0].length
        }
      } while (match)
    }

    // raw text from last match to the end
    if (lastIndex < text.length) {
      elements.push(<span>{text.slice(lastIndex)}</span>)
    }

    return elements
  }
}
