'use babel'
/* eslint-env jasmine */

import temp from 'temp'

class Lifecycle {
  constructor () {
    this.env = Object.assign({}, process.env)
    this.temp = temp
    this.temp.track()
    this.mainModule = null
  }

  dispose () {
    this.env = null
    this.temp = null
    this.mainModule = null
  }

  setup () {
    this.env = Object.assign({}, process.env)
    atom.config.set('go-plus.disableToolCheck', true)
    atom.config.set('go-plus.testing', true)
    atom.config.set('go-plus.guru.highlightIdentifiers', false)
  }

  activatePackage () {
    atom.packages.triggerDeferredActivationHooks()

    atom.packages.triggerActivationHook('language-go:grammar-used')
    atom.packages.triggerActivationHook('core:loaded-shell-environment')

    return Promise.all([
      atom.packages.activatePackage('language-go'),
      atom.packages.activatePackage('go-plus').then((pack) => {
        this.mainModule = pack.mainModule
      })
    ])
  }

  teardown () {
    if (this.env) {
      process.env = this.env
      this.env = null
    }
    this.mainModule = null
    atom.config.set('go-plus.testing', false)
  }
}

const lifecycle = new Lifecycle()

export {lifecycle}
