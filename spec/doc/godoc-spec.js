'use babel'
/* eslint-env jasmine */

import path from 'path'
import fs from 'fs-extra'
import {lifecycle} from './../spec-helpers'

describe('godoc', () => {
  let godoc = null
  let editor = null
  let gopath = null
  let source = null
  let target = null

  beforeEach(() => {
    runs(() => {
      lifecycle.setup()

      gopath = fs.realpathSync(lifecycle.temp.mkdirSync('gopath-'))
      process.env.GOPATH = gopath
    })

    waitsForPromise(() => {
      return lifecycle.activatePackage()
    })

    runs(() => {
      const { mainModule } = lifecycle
      mainModule.provideGoConfig()
      mainModule.provideGoGet()
      mainModule.loadDoc()
    })

    waitsFor(() => {
      godoc = lifecycle.mainModule.godoc
      return godoc
    })
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  describe('when determining if the decl is a method', () => {
    it('returns the type of the method receiver (non-pointer)', () => {
      const receiverType = godoc.declIsMethod('func (a Auth) Foo() error')
      expect(receiverType).toBeDefined()
      expect(receiverType).toBe('Auth')
    })

    it('returns the type of the method receiver (pointer)', () => {
      const receiverType = godoc.declIsMethod('func (a *Auth) Foo() error')
      expect(receiverType).toBeDefined()
      expect(receiverType).toBe('Auth')
    })

    it('returns undefined for non-methods', () => {
      for (const decl of [
        'func Foo() error',
        'var w io.Writer',
        'const Foo = "Bar"'
      ]) {
        const result = godoc.declIsMethod(decl)
        expect(result).not.toBeDefined()
      }
    })
  })

  describe('when the godoc command is invoked on a valid go file', () => {
    let result = false
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

      runs(() => {
        editor.setCursorBufferPosition([24, 10])

        waitsForPromise(() => {
          return godoc.commandInvoked().then((r) => {
            result = r
          })
        })
      })
    })

    it('executes gogetdoc successfully', () => {
      runs(() => {
        expect(result).toBeTruthy()
        expect(result.success).toBe(true)
        expect(result.result.exitcode).toBe(0)
      })
    })

    it('returns a godoc.org link', () => {
      runs(() => {
        expect(result.doc.gddo).toBe('https://godoc.org/godoctest#Foo.ChangeMessage')
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

        expect(result.doc).toBeTruthy()
        expect(result.doc.import).toBe('fmt')
        expect(result.doc.decl).toBe('func Printf(format string, a ...interface{}) (n int, err error)')
        expect(result.doc.gddo).toBe('https://godoc.org/fmt#Printf')
      })
    })
  })
})
