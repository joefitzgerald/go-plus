'use babel'
/* eslint-env jasmine */

import {lifecycle} from './../spec-helpers'
import mainModule from './../../lib/main'

describe('go-get service provider', () => {
  beforeEach(() => {
    lifecycle.setup()
    mainModule.activate()
  })

  afterEach(() => {
    lifecycle.teardown()
    mainModule.deactivate()
  })

  describe('the provider', () => {
    it('is truthy', () => {
      expect(mainModule.provideGoGet).toBeDefined()
      expect(mainModule.provideGoGet()).toBeTruthy()
    })
  })

  describe('the 2.0.0 provider', () => {
    it('is truthy', () => {
      expect(mainModule.provideGoGet).toBeDefined()
      expect(mainModule.provideGoGet()).toBeTruthy()
    })

    it('has a get function', () => {
      expect(mainModule.provideGoGet().get).toBeDefined()
    })

    it('has a register function', () => {
      expect(mainModule.provideGoGet().register).toBeDefined()
    })

    describe('register()', () => {
      let manager
      let provider
      beforeEach(() => {
        provider = mainModule.provideGoGet()
        manager = mainModule.getservice.getmanager
        expect(manager).toBeTruthy()
        expect(manager.packages).toBeTruthy()
        expect(manager.packages.size).toBe(0)
      })

      it('registers a package', () => {
        provider.register('github.com/mdempsky/gocode')
        expect(manager.packages.size).toBe(1)
        provider.register('github.com/mdempsky/gocode')
        expect(manager.packages.size).toBe(1)
      })

      it('registers the same package multiple times', () => {
        provider.register('github.com/mdempsky/gocode')
        expect(manager.packages.size).toBe(1)
        provider.register('github.com/mdempsky/gocode')
        expect(manager.packages.size).toBe(1)
        provider.register('github.com/mdempsky/gocode')
        expect(manager.packages.size).toBe(1)
      })

      it('allows a package registration to be disposed', () => {
        let registration = provider.register('github.com/mdempsky/gocode')
        expect(registration).toBeTruthy()
        expect(registration.dispose).toBeDefined()
        expect(manager.packages.size).toBe(1)
        registration.dispose()
        expect(manager.packages.size).toBe(0)
      })

      it('dispose is aware of the number of package registrations', () => {
        let registration1 = provider.register('github.com/mdempsky/gocode')
        expect(registration1).toBeTruthy()
        expect(registration1.dispose).toBeDefined()
        expect(manager.packages.size).toBe(1)
        let registration2 = provider.register('github.com/mdempsky/gocode')
        expect(registration2).toBeTruthy()
        expect(registration2.dispose).toBeDefined()
        expect(manager.packages.size).toBe(1)
        registration1.dispose()
        expect(manager.packages.size).toBe(1)
        registration2.dispose()
        expect(manager.packages.size).toBe(0)
        registration1.dispose()
        registration2.dispose()
        expect(manager.packages.size).toBe(0)
      })
    })
  })
})
