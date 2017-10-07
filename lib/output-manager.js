'use babel'

export default class OutputManager {
  constructor () {
    this.key = 'output'
    this.tab = {
      name: 'Output',
      packageName: 'go-plus',
      icon: 'check',
      order: 200
    }
    this.output = ''
  }

  update (props) {
    const oldProps = this.props
    this.props = Object.assign({}, oldProps, props)

    const {exitcode = 0} = this.props
    if (exitcode !== 0 && this.requestFocus) {
      if (atom.config.get('go-plus.panel.focusOnFailure')) {
        this.requestFocus()
      }
    }

    if (this.view) {
      this.view.update()
    }
  }
}
