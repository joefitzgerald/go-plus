'use babel'
/* eslint-env jasmine */

import {lifecycle} from './../spec-helpers'

describe('go-plus', () => {
  beforeEach(() => {
    runs(() => {
      lifecycle.setup()
    })

    waitsForPromise(() => {
      return lifecycle.activatePackage()
    })
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  describe('when the go-plus package is activated', () => {
    it('activates successfully', () => {
      const { mainModule } = lifecycle
      expect(mainModule).toBeDefined()
      expect(mainModule).toBeTruthy()
      expect(mainModule.activate).toBeDefined()
      expect(mainModule.deactivate).toBeDefined()
    })
  })
})
