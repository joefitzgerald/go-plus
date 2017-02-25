'use babel'
/* eslint-env jasmine */

import path from 'path'
import SaveEventOrchestrator from './../lib/save-event'

describe('save event orchestrator', () => {
  let saveEvent = null

  beforeEach(() => {
    saveEvent = new SaveEventOrchestrator()
  })

  afterEach(() => {
    saveEvent.dispose()
  })

  describe('onDidSave subscription', () => {
    it('throws an error if a callback is not provided', () => {
      expect(() => { saveEvent.onDidSave() }).toThrow()
    })

    it('throws an error if the callback is not a function', () => {
      expect(() => { saveEvent.onDidSave(42) }).toThrow()
    })

    it('registers a callback that can be unregistered', () => {
      const callback = () => {}
      const disp = saveEvent.onDidSave(callback)
      expect(saveEvent.didSaveCallbacks.size).toBe(1)

      disp.dispose()
      expect(saveEvent.didSaveCallbacks.size).toBe(0)
    })

    it('runs a single callback', () => {
      let called = false

      runs(() => {
        const callback = () => { called = true; return true }
        saveEvent.onDidSave(callback)
      })

      waitsForPromise(() => {
        const filepath = path.join(__dirname, 'fixtures', 'main.go')
        return atom.workspace.open(filepath).then((e) => {
          e.save()
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
        saveEvent.onDidSave(callback0)
        saveEvent.onDidSave(callback1)
      })

      waitsForPromise(() => {
        const filepath = path.join(__dirname, 'fixtures', 'main.go')
        return atom.workspace.open(filepath).then((e) => {
          e.save()
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
        saveEvent.onDidSave(callback0)
        saveEvent.onDidSave(callback1)
      })

      waitsForPromise(() => {
        const filepath = path.join(__dirname, 'fixtures', 'main.go')
        return atom.workspace.open(filepath).then((e) => {
          e.save()
        })
      })

      runs(() => {
        expect(called[0]).toBe(true)
        expect(called[1]).toBe(false)
      })
    })
  })

  describe('onWillSave subscription', () => {
    it('throws an error if a callback is not provided', () => {
      expect(() => { saveEvent.onWillSave() }).toThrow()
    })

    it('throws an error if the callback is not a function', () => {
      expect(() => { saveEvent.onWillSave(42) }).toThrow()
    })

    it('registers a callback that can be unregistered', () => {
      const callback = () => {}
      const disp = saveEvent.onWillSave(callback)
      expect(saveEvent.willSaveCallbacks.size).toBe(1)

      disp.dispose()
      expect(saveEvent.willSaveCallbacks.size).toBe(0)
    })

    it('runs a single callback', () => {
      let called = false

      runs(() => {
        const callback = () => { called = true; return true }
        saveEvent.onWillSave(callback)
      })

      waitsForPromise(() => {
        const filepath = path.join(__dirname, 'fixtures', 'main.go')
        return atom.workspace.open(filepath).then((e) => {
          e.save()
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
        saveEvent.onWillSave(callback0)
        saveEvent.onWillSave(callback1)
      })

      waitsForPromise(() => {
        const filepath = path.join(__dirname, 'fixtures', 'main.go')
        return atom.workspace.open(filepath).then((e) => {
          e.save()
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
        saveEvent.onWillSave(callback0)
        saveEvent.onWillSave(callback1)
      })

      waitsForPromise(() => {
        const filepath = path.join(__dirname, 'fixtures', 'main.go')
        return atom.workspace.open(filepath).then((e) => {
          e.save()
        })
      })

      runs(() => {
        expect(called[0]).toBe(true)
        expect(called[1]).toBe(false)
      })
    })
  })
})
