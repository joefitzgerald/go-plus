/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import etch from 'etch'
import fs from 'fs'
import path from 'path'
import EtchComponent from './../etch-component'
import { parseGoPosition } from '../utils'
import FileLink from './../file-link'

export default class TestPanel extends EtchComponent {
  constructor (props) {
    if (!props) {
      props = {}
    }
    super(props)
    if (this.props.model) {
      this.props.model.view = this
    }
    this.locationRegex = /([\w]*_test.go:\d+)/g
  }

  render () {
    let output = ''
    let style = ''
    if (this.props && this.props.model) {
      output = this.props.model.content()
      if (this.props.model.orientation === 'vertical') {
        style = style + 'width: 100%; word-wrap: break-word;'
      }
    }

    return (
      <div ref='content' className='go-plus-test-panel' scrollTop={this.scrollHeight} style={style}>
        <FileLink text={output} locationRegex={this.locationRegex} linkClicked={this.linkClicked} />
      </div>
    )
  }

  linkClicked (text) {
    const {file, line, column} = parseGoPosition(text)
    const base = atom.project.getPaths()[0] || process.env.PWD

    // TODO: smarter search for file (check all project paths?)
    fs.access(path.join(base, file), fs.constants.F_OK | fs.constants.R_OK, (err) => {
      if (err) {
        console.log('could not access ' + file, err)
        return
      }
      const col = column && column > 0 ? column - 1 : 0
      atom.workspace.open(file).then((editor) => {
        editor.setCursorBufferPosition([line - 1, col])
      })
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
    this.props = null
    this.locationRegex = null
  }
}
