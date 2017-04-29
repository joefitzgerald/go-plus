'use babel'
/* eslint-env jasmine */

import fs from 'fs-extra'
import path from 'path'
import {lifecycle} from './../spec-helpers'

describe('implements', () => {
  let impl
  let editor
  let gopath
  let source
  let target

  beforeEach(() => {
    runs(() => {
      lifecycle.setup()

      gopath = fs.realpathSync(lifecycle.temp.mkdirSync('gopath-'))
      process.env.GOPATH = gopath

      source = path.join(__dirname, '..', 'fixtures', 'implements')
      target = path.join(gopath, 'src', 'implements')
      fs.copySync(source, target)
    })

    waitsForPromise(() => {
      return lifecycle.activatePackage()
    })

    runs(() => {
      const {mainModule} = lifecycle
      mainModule.provideGoConfig()
      mainModule.loadImplements()
    })

    waitsFor(() => {
      impl = lifecycle.mainModule.implements
      return impl
    })

    runs(() => {
      impl.view = {}
      impl.view.update = jasmine.createSpy('update')

      impl.requestFocus = jasmine.createSpy('requestFocus').andReturn(Promise.resolve())
    })

    waitsForPromise(() => {
      return atom.workspace.open(path.join(target, 'main.go')).then((e) => {
        editor = e
      })
    })
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  it('updates the view when invoking guru', () => {
    waitsForPromise(() => {
      return impl.handleCommand()
    })

    runs(() => {
      expect(impl.view.update).toHaveBeenCalled()
    })
  })

  it('updates the view when guru fails', () => {
    waitsForPromise(() => {
      return impl.handleCommand()
    })

    runs(() => {
      expect(impl.view.update).toHaveBeenCalled()
      expect(impl.view.update.calls.length).toBe(2)
      expect(impl.view.update.calls[0].args[0].startsWith('running guru')).toBe(true)

      expect(typeof impl.view.update.calls[1].args[0]).toBe('string')
      expect(impl.view.update.calls[1].args[0].startsWith('guru failed')).toBe(true)
    })
  })

  it('updates the view when guru succeeds', () => {
    runs(() => {
      editor.setCursorBufferPosition([4, 9])
    })

    waitsForPromise(() => {
      return impl.handleCommand()
    })

    runs(() => {
      expect(impl.view.update).toHaveBeenCalled()
      expect(impl.view.update.calls.length).toBe(2)
      expect(impl.view.update.calls[0].args[0].startsWith('running guru')).toBe(true)

      const guruResult = impl.view.update.calls[1].args[0]
      expect(typeof guruResult).toBe('object')
      expect(guruResult.type.kind).toBe('struct')
      expect(guruResult.type.name).toBe('implements.Impl')

      expect(guruResult.from.length).toBe(2)
      expect(guruResult.from[0].name).toBe('implements.Fooer')
      expect(guruResult.from[1].name).toBe('io.Reader')
    })
  })
})
