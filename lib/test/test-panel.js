/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import etch from 'etch'
import EtchComponent from './../etch-component'

export default class TestPanel extends EtchComponent {
  constructor (props) {
    if (!props) {
      props = {}
    }
    super(props)
    if (this.props.model) {
      this.props.model.view = this
    }
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
      <div ref='content' className='go-plus-test-panel' scrollTop={this.scrollHeight} style={style} innerHTML={output} />
    )
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
  }
}
