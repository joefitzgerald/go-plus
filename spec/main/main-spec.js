'use babel'
/* eslint-env jasmine */

import {lifecycle} from './../spec-helpers'

describe('go-plus', () => {
  let mainModule = null

  beforeEach(() => {
    runs(() => {
      lifecycle.setup()
      atom.packages.triggerDeferredActivationHooks()
      let pack = atom.packages.loadPackage('go-plus')
      pack.activateNow()
      atom.packages.triggerActivationHook('core:loaded-shell-environment')
      atom.packages.triggerActivationHook('language-go:grammar-used')
      mainModule = pack.mainModule
    })

    waitsFor(() => { return mainModule && mainModule.loaded })
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  describe('when the go-plus package is activated', () => {
    it('activates successfully', () => {
      expect(mainModule).toBeDefined()
      expect(mainModule).toBeTruthy()
      expect(mainModule.activate).toBeDefined()
      expect(mainModule.deactivate).toBeDefined()
    })
  })
})
