'use babel'
/* eslint-env jasmine */

import temp from 'temp'

class Lifecycle {
  constructor () {
    this.env = Object.assign({}, process.env)
    this.temp = temp
    this.temp.track()
  }

  dispose () {
    this.env = null
    this.temp = null
  }

  setup () {
    this.env = Object.assign({}, process.env)
    atom.config.set('go-plus.disableToolCheck', true)
    atom.config.set('go-plus.testing', true)
  }

  teardown () {
    if (this.env) {
      process.env = this.env
      this.env = null
    }
    atom.config.set('go-plus.testing', false)
  }
}

const lifecycle = new Lifecycle()

export {lifecycle}
