'use babel'
/* eslint-env jasmine */

import path from 'path'
import {Orchestrator} from './../lib/orchestrator'

describe('orchestrator', () => {
  let orchestrator = null

  beforeEach(() => {
    runs(() => {
      orchestrator = new Orchestrator()
    })

    waitsForPromise(() => {
      return atom.packages.activatePackage('language-go')
    })
  })

  afterEach(() => {
    orchestrator.dispose()
  })

  describe('register', () => {
    it('throws an error if a callback is not provided', () => {
      expect(() => { orchestrator.register('test') }).toThrow()
    })

    it('throws an error if the callback is not a function', () => {
      expect(() => { orchestrator.register('test', 42) }).toThrow()
    })

    it('registers a callback that can be unregistered', () => {
      const callback = () => {}
      const disp = orchestrator.register('test', callback)
      expect(orchestrator.didSaveCallbacks.size).toBe(1)

      disp.dispose()
      expect(orchestrator.didSaveCallbacks.size).toBe(0)
    })

    it('runs a single callback', () => {
      let called = false

      runs(() => {
        const callback = () => { called = true; return Promise.resolve(true) }
        orchestrator.register('test', callback)
      })

      waitsForPromise(() => {
        const filepath = path.join(__dirname, 'fixtures', 'main.go')
        return atom.workspace.open(filepath).then((e) => {
          return e.save()
        })
      })

      runs(() => {
        expect(called).toBe(true)
      })
    })

    it('runs multiple callbacks', () => {
      let called = [false, false]

      runs(() => {
        const callback0 = () => { called[0] = true; return Promise.resolve(true) }
        const callback1 = () => { called[1] = true; return Promise.resolve(true) }
        orchestrator.register('callback0', callback0)
        orchestrator.register('callback1', callback1)
      })

      waitsForPromise(() => {
        const filepath = path.join(__dirname, 'fixtures', 'main.go')
        return atom.workspace.open(filepath).then((e) => {
          return e.save()
        })
      })

      waitsFor(() => {
        return called[0] === true && called[1] === true
      }, 'Both callbacks should be called', 1000)

      runs(() => {
        expect(called[0]).toBe(true)
        expect(called[1]).toBe(true)
      })
    })

    it('stops invoking callbacks when a promise is rejected', () => {
      let called = [false, false]

      runs(() => {
        const callback0 = () => { called[0] = true; return Promise.reject(new Error()) }
        const callback1 = () => { called[1] = true; return Promise.resolve(true) }
        orchestrator.register('callback0', callback0)
        orchestrator.register('callback1', callback1)
      })

      waitsForPromise(() => {
        const filepath = path.join(__dirname, 'fixtures', 'main.go')
        return atom.workspace.open(filepath).then((e) => {
          return e.save()
        })
      })

      runs(() => {
        expect(called[0]).toBe(true)
        expect(called[1]).toBe(false)
      })
    })
  })

  describe('register / onWillSave', () => {
    it('throws an error if a callback is not provided', () => {
      expect(() => { orchestrator.register('test', undefined, 'willSave') }).toThrow()
    })

    it('throws an error if the callback is not a function', () => {
      expect(() => { orchestrator.register('test', 42, 'willSave') }).toThrow()
    })

    it('registers a callback that can be unregistered', () => {
      const callback = () => {}
      const disp = orchestrator.register('test', callback, 'willSave')
      expect(orchestrator.willSaveCallbacks.size).toBe(1)

      disp.dispose()
      expect(orchestrator.willSaveCallbacks.size).toBe(0)
    })

    it('runs a single callback', () => {
      let called = false

      runs(() => {
        const callback = () => { called = true; return true }
        orchestrator.register('test', callback, 'willSave')
      })

      waitsForPromise(() => {
        const filepath = path.join(__dirname, 'fixtures', 'main.go')
        return atom.workspace.open(filepath).then((e) => {
          return e.save()
        })
      })

      runs(() => {
        expect(called).toBe(true)
      })
    })

    it('runs multiple callbacks', () => {
      let called = [false, false]

      runs(() => {
        const callback0 = () => { called[0] = true; return true }
        const callback1 = () => { called[1] = true; return true }
        orchestrator.register('test', callback0, 'willSave')
        orchestrator.register('test', callback1, 'willSave')
      })

      waitsForPromise(() => {
        const filepath = path.join(__dirname, 'fixtures', 'main.go')
        return atom.workspace.open(filepath).then((e) => {
          return e.save()
        })
      })

      runs(() => {
        expect(called[0]).toBe(true)
        expect(called[1]).toBe(true)
      })
    })

    it('stops invoking callbacks when encountering a non-true return value', () => {
      let called = [false, false]

      runs(() => {
        const callback0 = () => { called[0] = true; return false }
        const callback1 = () => { called[1] = true; return true }
        orchestrator.register('test', callback0, 'willSave')
        orchestrator.register('test', callback1, 'willSave')
      })

      waitsForPromise(() => {
        const filepath = path.join(__dirname, 'fixtures', 'main.go')
        return atom.workspace.open(filepath).then((e) => {
          return e.save()
        })
      })

      runs(() => {
        expect(called[0]).toBe(true)
        expect(called[1]).toBe(false)
      })
    })
  })
})
