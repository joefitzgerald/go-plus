// @flow

/* eslint-env jasmine */

import temp from '@atom/temp'

class Lifecycle {
  env: Object
  temp: temp
  mainModule: any

  constructor() {
    this.env = Object.assign({}, process.env)
    this.temp = temp
    this.temp.track()
    this.mainModule = null
  }

  dispose() {
    this.temp = null
    this.mainModule = null
  }

  setup() {
    this.env = Object.assign({}, process.env)
    atom.config.set('go-plus.disableToolCheck', true)
    atom.config.set('go-plus.testing', true)
    atom.config.set('go-plus.guru.highlightIdentifiers', false)
  }

  activatePackage() {
    atom.packages.triggerDeferredActivationHooks()
    atom.packages.triggerActivationHook('language-go:grammar-used')
    atom.packages.triggerActivationHook('core:loaded-shell-environment')

    return Promise.all([
      atom.packages.activatePackage('language-go').catch(e => {
        // eslint-disable-next-line no-console
        jasmine.getEnv().currentSpec.fail(e)
        throw e
      }),
      atom.packages.activatePackage('go-plus').then(
        pkg => {
          this.mainModule = pkg.mainModule
          return pkg
        },
        e => {
          jasmine.getEnv().currentSpec.fail(e)
          throw e
        }
      )
    ]).catch(e => {
      jasmine.getEnv().currentSpec.fail(e)
      throw e
    })
  }

  teardown() {
    if (this.env) {
      process.env = this.env
    }
    if (this.mainModule) this.mainModule.dispose()
    this.mainModule = null
    atom.config.set('go-plus.testing', false)
  }
}

const lifecycle = new Lifecycle()

export { lifecycle }
