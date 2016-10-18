'use babel'

import {CompositeDisposable} from 'atom'
import Ansi from 'ansi-to-html'

class TestPanelManager {
  constructor () {
    this.subscriptions = new CompositeDisposable()
    this.key = 'test'

    this.props = {output: this.emptyContent()}
    this.props.htmlOutput = this.props.output
    this.ansi = new Ansi({newline: true})
  }

  dispose () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    this.ansi = null
  }

  emptyContent () {
    if (atom.config.get('tester-go.runTestsOnSave')) {
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
    let oldProps = this.props
    this.props = Object.assign({}, oldProps, props)

    if (this.view && this.props.output && this.props.output.length > 0) {
      this.props.htmlOutput = this.ansi.toHtml(this.props.output)
      this.view.update()
    }

    if (this.props.exitcode && this.props.exitcode === 1 && this.requestFocus) {
      if (atom.config.get('tester-go.focusPanelIfTestsFail')) {
        this.requestFocus()
      }
    }
  }
}
export {TestPanelManager}
