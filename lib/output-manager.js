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

  isActive (active) {
    this.active = active
    console.log('set active to', active)
    console.log('view is', this.view)
  }

  setOrientation (orientation) {
    this.orientation = orientation
  }

  update (props) {
    const {exitcode = 0} = props

    if (exitcode !== 0 && this.requestFocus) {
      if (atom.config.get('go-plus.panel.focusOnFailure')) {
        this.requestFocus()
      }
    }

    if (this.view) {
      this.view.update(props)
    }
  }
}
