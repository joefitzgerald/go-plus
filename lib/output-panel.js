// @flow
/** @jsx etch.dom */
'use babel'
/* eslint-disable react/no-unknown-property */

import etch from 'etch'
import path from 'path'
import EtchComponent from './etch-component'
import AnsiStyle from './ansi'
import { openFile, parseGoPosition, projectPath } from './utils'

const locationRegex = /([\w-/.\\:]*.go:\d+(:\d+)?)/g

export default class OutputPanel extends EtchComponent {
  scrollHeight: number

  constructor (props: Object = {}) {
    super(props)
    if (this.props.model) {
      this.props.model.view = this
    }
  }

  makeLink (text: string) {
    const elements = []
    let lastIndex = 0
    let match

    do {
      match = locationRegex.exec(text)
      if (match && match.hasOwnProperty('index')) {
        // take raw text up to this match
        elements.push(<span>{text.slice(lastIndex, match.index)}</span>)

        const linkText = match[0]
        // convert the match to a link
        elements.push(<a onclick={() => this.linkClicked(linkText, this.props.model.props.dir)}>{linkText}</a>)
        lastIndex = match.index + match[0].length
      }
    } while (match)

    // raw text from last match to the end
    if (lastIndex < text.length) {
      elements.push(<span>{text.slice(lastIndex)}</span>)
    }

    return elements
  }

  render () {
    let style = ''
    let output = ''
    if (this.props.model && this.props.model.props && this.props.model.props.output) {
      output = this.props.model.props.output
    }

    return (
      <div ref='content' className='go-plus-output-panel' scrollTop={this.scrollHeight} style={style}>
        <AnsiStyle text={output} mapText={this.makeLink.bind(this)} />
      </div>
    )
  }

  linkClicked (text: string, dir: string) {
    const {file, line = 1, column = 0} = parseGoPosition(text)

    let filepath
    if (path.isAbsolute(file)) {
      filepath = file
    } else {
      const base = dir || projectPath()
      if (!base) {
        return
      }
      filepath = path.join(base, file)
    }

    const col = column && column > 0 ? column - 1 : 0
    openFile(filepath, {row: line - 1, column: col}).catch((err) => {
      console.log('could not access ' + file, err)
    })
  }

  readAfterUpdate () {
    const content = this.refs.content
    if (!content) {
      return
    }

    const scrollHeight = content.scrollHeight
    if (scrollHeight && this.scrollHeight !== scrollHeight) {
      this.scrollHeight = scrollHeight
      content.scrollTop = this.scrollHeight
      this.update()
    }
  }

  dispose () {
    this.destroy()
  }

  destroy () {
    super.destroy()
    this.props = {}
  }
}
