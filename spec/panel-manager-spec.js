/** @babel */
/* eslint-env jasmine */

import {lifecycle} from './spec-helpers'
import EmptyTabView from './../lib/panel/empty-tab-view'

describe('panel manager', () => {
  let pm = null

  beforeEach(() => {
    runs(() => {
      lifecycle.setup()
    })

    waitsForPromise(() => {
      return lifecycle.activatePackage()
    })

    runs(() => {
      const { mainModule } = lifecycle
      mainModule.getPanelManager()
    })

    waitsFor(() => {
      pm = lifecycle.mainModule.panelManager
      return pm
    })
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  describe('registerViewProvider', () => {
    let view
    let model
    let disp

    beforeEach(() => {
      view = new EmptyTabView()
      model = { key: 'foo' }

      disp = pm.registerViewProvider(view, model)
    })

    afterEach(() => {
      disp.dispose()
    })

    it('provides the model with a requestFocus func that returns a promise', () => {
      expect(typeof model.requestFocus).toBe('function')

      const result = model.requestFocus()
      expect(typeof result.then).toBe('function')
    })

    it('records the view provider by key', () => {
      const {view: v, model: m} = pm.viewProviders.get(model.key)
      expect(v).toBe(view)
      expect(m).toBe(model)
    })
  })
})
