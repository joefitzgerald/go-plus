/* eslint-env jasmine */
// @flow

import path from 'path'
import fs from 'fs-extra'
import { lifecycle } from './../spec-helpers'
import { it, fit, ffit, beforeEach, runs } from '../async-spec-helpers' // eslint-disable-line

describe('godoc', () => {
  let godoc
  let editor
  let gopath
  let source = null
  let target = null

  beforeEach(async () => {
    lifecycle.setup()
    gopath = fs.realpathSync(lifecycle.temp.mkdirSync('gopath-'))
    process.env.GOPATH = gopath
    await lifecycle.activatePackage()
    const { mainModule } = lifecycle
    mainModule.provideGoConfig()
    mainModule.provideGoGet()
    godoc = mainModule.loadDoc()
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
    let result
    beforeEach(async () => {
      source = path.join(__dirname, '..', 'fixtures')
      target = path.join(gopath, 'src', 'godoctest')
      fs.copySync(source, target)
      atom.project.setPaths([target])
      editor = await atom.workspace.open(path.join(target, 'doc.go'))
      editor.setCursorBufferPosition([24, 10])
    })

    it('provides tooltips', async () => {
      const pos = editor.getCursorBufferPosition()
      const tip = await godoc.datatip(editor, pos)
      expect(tip).toBeTruthy()
      expect(tip.range.start).toBe(pos)
      expect(tip.range.end).toBe(pos)
      expect(tip.markedStrings.length).toEqual(1)
    })

    it('executes gogetdoc successfully', () => {
      runs(async () => {
        result = await godoc.commandInvoked()
        expect(result).toBeTruthy()
        expect(result.success).toBe(true)
      })
    })

    it('returns a godoc.org link', () => {
      expect(result.doc.gddo).toBe(
        'https://godoc.org/godoctest#Foo.ChangeMessage'
      )
    })
  })

  describe('when the godoc command is invoked on an unsaved go file', () => {
    beforeEach(async () => {
      source = path.join(__dirname, '..', 'fixtures')
      target = path.join(gopath, 'src', 'godoctest')
      fs.copySync(source, target)
      atom.project.setPaths([target])
      editor = await atom.workspace.open(path.join(target, 'doc.go'))
      expect(editor).toBeDefined()
      editor.setCursorBufferPosition([24, 35])
      editor.selectLinesContainingCursors()
      editor.insertText('fmt.Printf("this line has been modified\\n")\n')
      expect(editor.isModified()).toBe(true)
    })

    it('gets the correct documentation', async () => {
      let result = false
      editor.setCursorBufferPosition([24, 7])
      result = await godoc.commandInvoked()
      expect(result).toBeTruthy()
      expect(result.success).toBe(true)
      expect(result.doc).toBeTruthy()
      expect(result.doc.import).toBe('fmt')
      expect(result.doc.decl).toBe(
        'func Printf(format string, a ...interface{}) (n int, err error)'
      )
      expect(result.doc.gddo).toBe('https://godoc.org/fmt#Printf')
    })
  })
})
