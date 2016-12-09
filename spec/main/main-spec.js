'use babel'
/* eslint-env jasmine */

import {lifecycle} from './../spec-helpers'

describe('go-plus', () => {
  let mainModule = null

  beforeEach(() => {
    lifecycle.setup()
    let pack = atom.packages.loadPackage('go-plus')
    pack.activateNow()
    mainModule = pack.mainModule

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
