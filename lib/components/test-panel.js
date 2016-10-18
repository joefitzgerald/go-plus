/** @babel */
/** @jsx etch.dom */
/* eslint-disable react/no-unknown-property */

import etch from 'etch'
import EtchComponent from '../etch-component'

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
    if (this.props && this.props.model) {
      output = this.props.model.content()
    }

    return (
      <div ref='content' className='tester-go-panel' scrollTop={this.scrollHeight} innerHTML={output} />
    )
  }

  readAfterUpdate () {
    let content = this.refs.content
    if (!content) {
      return
    }

    let scrollHeight = content.scrollHeight
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
