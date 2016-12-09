'use babel'
/* eslint-env jasmine */

import path from 'path'
import fs from 'fs-plus'
import {lifecycle} from './../spec-helpers'

describe('godoc', () => {
  let mainModule = null
  let godoc = null
  let editor = null
  let gopath = null
  let source = null
  let target = null

  beforeEach(() => {
    lifecycle.setup()
    runs(() => {
      gopath = fs.realpathSync(lifecycle.temp.mkdirSync('gopath-'))
      process.env.GOPATH = gopath
    })

    waitsForPromise(() => {
      return atom.packages.activatePackage('language-go')
    })

    runs(() => {
      let pack = atom.packages.loadPackage('go-plus')
      pack.activateNow()
      mainModule = pack.mainModule
      mainModule.getGoconfig()
      mainModule.getGoget()
      mainModule.loadDoc()
    })

    waitsFor(() => { return mainModule && mainModule.loaded })

    waitsFor(() => {
      godoc = mainModule.godoc
      return godoc
    })
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  describe('when the godoc command is invoked on a valid go file', () => {
    beforeEach(() => {
      runs(() => {
        source = path.join(__dirname, '..', 'fixtures')
        target = path.join(gopath, 'src', 'godoctest')
        fs.copySync(source, target)
      })

      waitsForPromise(() => {
        return atom.workspace.open(path.join(target, 'doc.go')).then((e) => {
          editor = e
        })
      })
    })

    it('gets the correct documentation', () => {
      let result = false
      editor.setCursorBufferPosition([24, 10])
      waitsForPromise(() => {
        return godoc.commandInvoked().then((r) => {
          result = r
        })
      })
      runs(() => {
        expect(result).toBeTruthy()
        expect(result.success).toBe(true)
        expect(result.result.exitcode).toBe(0)
      })
    })
  })

  describe('when the godoc command is invoked on an unsaved go file', () => {
    beforeEach(() => {
      runs(() => {
        source = path.join(__dirname, '..', 'fixtures')
        target = path.join(gopath, 'src', 'godoctest')
        fs.copySync(source, target)
      })

      waitsForPromise(() => {
        return atom.workspace.open(path.join(target, 'doc.go')).then((e) => {
          e.setCursorBufferPosition([25, 46])
          e.selectLinesContainingCursors()
          e.insertText('fmt.Printf("this line has been modified\n")')
          expect(e.isModified()).toBe(true)
          editor = e
          return
        })
      })
    })

    it('gets the correct documentation', () => {
      let result = false
      editor.setCursorBufferPosition([25, 7])

      waitsForPromise(() => {
        return godoc.commandInvoked().then((r) => {
          result = r
        })
      })

      runs(() => {
        expect(result).toBeTruthy()
        expect(result.success).toBe(true)
        expect(result.result.exitcode).toBe(0)
        expect(result.result.stdout).toBeTruthy()
        expect(result.result.stdout.startsWith('import "fmt"')).toBe(true)
      })
    })
  })
})
