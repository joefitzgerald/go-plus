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
  }

  setOrientation (orientation) {
    this.orientation = orientation
  }

  content () {
    return this.output
  }

  update (props) {
    const {exitcode = 0, output} = props
    this.content = output
    if (this.view) {
      this.view.update(props)
    }

    if (exitcode !== 0 && this.requestFocus) {
        // TODO: monitor atom config, determine if we should request focus
    }
  }
}
