'use babel'
/* eslint-env jasmine */

import path from 'path'
import fs from 'fs-plus'
import {lifecycle} from './../spec-helpers'

describe('gorename', () => {
  let mainModule = null
  let gorename = null
  let editor = null
  let gopath = null
  let source = null
  let target = null

  beforeEach(() => {
    runs(() => {
      lifecycle.setup()
      atom.packages.triggerDeferredActivationHooks()
      gopath = fs.realpathSync(lifecycle.temp.mkdirSync('gopath-'))
      process.env.GOPATH = gopath
    })

    waitsForPromise(() => {
      return atom.packages.activatePackage('language-go')
    })

    runs(() => {
      let pack = atom.packages.loadPackage('go-plus')
      pack.activateNow()
      atom.packages.triggerActivationHook('core:loaded-shell-environment')
      atom.packages.triggerActivationHook('language-go:grammar-used')
      mainModule = pack.mainModule
      mainModule.provideGoConfig()
      mainModule.provideGoGet()
      mainModule.loadGorename()
    })

    waitsFor(() => { return mainModule && mainModule.loaded })

    waitsFor(() => {
      gorename = mainModule.gorename
      return gorename
    })
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  describe('when a simple file is open', () => {
    beforeEach(() => {
      runs(() => {
        source = path.join(__dirname, '..', 'fixtures', 'gorename')
        target = path.join(gopath, 'src', 'basic')
        fs.copySync(source, target)
      })

      waitsForPromise(() => {
        return atom.workspace.open(path.join(target, 'main.go')).then((e) => {
          editor = e
          return
        })
      })
    })

    it('renames a single token', () => {
      editor.setCursorBufferPosition([4, 5])
      let info = gorename.wordAndOffset(editor)
      expect(info.word).toBe('foo')
      expect(info.offset).toBe(33)

      let file = editor.getBuffer().getPath()
      let cwd = path.dirname(file)
      let r = false
      let cmd

      waitsFor(() => {
        if (mainModule.provideGoConfig()) {
          return true
        }
        return false
      }, '', 750)

      waitsForPromise(() => {
        return mainModule.provideGoConfig().locator.findTool('gorename').then((c) => {
          expect(c).toBeTruthy()
          cmd = c
        })
      })
      waitsForPromise(() => {
        return gorename.runGorename(file, info.offset, cwd, 'bar', cmd).then((result) => {
          r = result
          return
        })
      })
      runs(() => {
        expect(r).toBeTruthy()
        expect(r.success).toBe(true)
        expect(r.result.stdout.trim()).toBe('Renamed 2 occurrences in 1 file in 1 package.')
        editor.destroy()
      })

      waitsForPromise(() => {
        return atom.workspace.open(path.join(target, 'main.go')).then((e) => {
          editor = e
          return
        })
      })

      runs(() => {
        let expected = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'gorename', 'expected'), 'utf8')
        let actual = editor.getText()
        expect(actual).toBe(expected)
      })
    })
  })
})
