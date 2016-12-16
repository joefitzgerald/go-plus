'use babel'

import {CompositeDisposable} from 'atom'
import Ansi from 'ansi-to-html'
import os from 'os'

class TestPanelManager {
  constructor () {
    this.subscriptions = new CompositeDisposable()
    this.key = 'test'
    this.tab = {
      name: 'Test',
      packageName: 'go-plus',
      icon: 'check',
      order: 200
    }
    this.props = {output: this.emptyContent()}
    this.props.htmlOutput = this.props.output
    this.ansi = new Ansi({newline: true, escapeXML: true})
  }

  dispose () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    this.ansi = null
  }

  isActive (active) {
    this.active = active
  }

  setOrientation (orientation) {
    this.orientation = orientation
  }

  emptyContent () {
    if (atom.config.get('go-plus.test.runTestsOnSave')) {
      return 'Save a file to run the tests in your package...'
    }
    return 'Run the `golang: run-tests` command to run the tests in your package...'
  }

  content () {
    if (this.props.htmlOutput && this.props.htmlOutput.length) {
      return this.props.htmlOutput
    }
    if (this.props.output && this.props.output.length) {
      return this.props.output
    }
    return this.emptyContent()
  }

  update (props) {
    const oldProps = this.props
    this.props = Object.assign({}, oldProps, props)

    if (this.props.exitcode === 124) {
      const timeoutMessage = 'Tests timed out after ' + atom.config.get('go-plus.test.timeout') + 'ms'
      if (!this.props.output || this.props.output.trim === '') {
        this.props.output = timeoutMessage
      } else {
        this.props.output = this.props.output + os.EOL + os.EOL + timeoutMessage
      }
    }

    if (this.props.output && this.props.output.length > 0) {
      this.props.htmlOutput = this.ansi.toHtml(this.props.output)
    }

    if (this.view) {
      this.view.update()
    }

    if (this.props.exitcode && this.props.exitcode !== 0 && this.requestFocus) {
      if (atom.config.get('go-plus.test.focusPanelIfTestsFail')) {
        this.requestFocus()
      }
    }
  }
}
export {TestPanelManager}
