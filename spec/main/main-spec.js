'use babel'
/* eslint-env jasmine */

import { lifecycle } from './../spec-helpers'
import { it, fit, ffit, beforeEach, runs } from '../async-spec-helpers' // eslint-disable-line

describe('go-plus', () => {
  beforeEach(async () => {
    lifecycle.setup()
    await lifecycle.activatePackage()
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
