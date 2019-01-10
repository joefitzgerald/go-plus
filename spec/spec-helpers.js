// @flow

/* eslint-env jasmine */

import temp from '@atom/temp'

global.jasmineLog = msg => {
  global.jasmine
    .getEnv()
    .currentSpec.fail(new Date().toISOString() + ' | ' + msg)
}
const log = global.jasmineLog

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

    const transpiler = require('atom-babel6-transpiler')
    const spy = spyOn(transpiler, 'transpile').andCallThrough()

    log('spec-helper - activatePackage')
    return Promise.all([
      atom.packages.activatePackage('language-go').catch(e => {
        // eslint-disable-next-line no-console
        log(e)
        throw e
      }),
      atom.packages.activatePackage('go-plus').then(
        pkg => {
          log('spec-helper - loaded go-plus')
          log('> mainModule? ' + !!pkg.mainModule)
          log('> required=' + !!pkg.mainModuleRequired)
          log('> path=' + pkg.mainModulePath)
          this.mainModule = pkg.mainModule
          if (!pkg.mainModule) {
            pkg.activateNow()
          }
          return pkg.activate().then( // eslint-disable-line
            () => {
              log('spec-helper - activated go-plus')
              log('> mainModule? ' + !!pkg.mainModule)
              log('> required=' + !!pkg.mainModuleRequired)
              log('> transpile calls=' + spy.calls.length)
              log('> isCompatible=' + pkg.isCompatible().toString())
              log('> build failures=' + (pkg.getBuildFailureOutput() || ''))
              log(
                '> incompatible native modules=' +
                  JSON.stringify(pkg.getIncompatibleNativeModules())
              )
              this.mainModule = pkg.mainModule
              return pkg
            },
            e => {
              log(e)
              throw e
            }
          )
        },
        e => {
          // eslint-disable-next-line no-console
          log(e)
          throw e
        }
      )
    ]).catch(e => {
      // eslint-disable-next-line no-console
      log(e)
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
