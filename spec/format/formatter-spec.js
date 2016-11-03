'use babel'
/* eslint-env jasmine */

import fs from 'fs'
import path from 'path'
import temp from 'temp'

let nl = '\n'

describe('formatter', () => {
  let mainModule = null
  let formatter = null

  beforeEach(() => {
    temp.track()
    atom.config.set('go-plus.format.formatOnSave', false)
    atom.config.set('editor.defaultLineEnding', 'LF')

    waitsForPromise(() => {
      return atom.packages.activatePackage('language-go').then(() => {
        return atom.packages.activatePackage('go-plus')
      }).then((pack) => {
        mainModule = pack.mainModule
        mainModule.getGoconfig()
        mainModule.getGoget()
        mainModule.loadFormatter()
      })
    })

    waitsFor(() => {
      formatter = mainModule.formatter
      return formatter
    })
  })

  describe('when a simple file is opened', () => {
    let editor
    let filePath
    let saveSubscription
    let actual

    beforeEach(() => {
      let directory = fs.realpathSync(temp.mkdirSync())
      atom.project.setPaths([directory])
      filePath = path.join(directory, 'gofmt.go')
      fs.writeFileSync(filePath, '')
      waitsForPromise(() => {
        return atom.workspace.open(filePath).then((e) => {
          editor = e
          saveSubscription = e.onDidSave(() => {
            actual = e.getText()
          })
        })
      })
    })

    afterEach(() => {
      if (saveSubscription) {
        saveSubscription.dispose()
      }

      actual = undefined
    })

    describe('when format on save is disabled and gofmt is the tool', () => {
      beforeEach(() => {
        atom.config.set('go-plus.format.formatOnSave', false)
        atom.config.set('go-plus.format.tool', 'gofmt')
      })

      it('does not format the file on save', () => {
        let text = 'package main' + nl + nl + 'func main()  {' + nl + '}' + nl
        let expected = text
        let formatted = 'package main' + nl + nl + 'func main() {' + nl + '}' + nl

        runs(() => {
          let buffer = editor.getBuffer()
          buffer.setText(text)
          buffer.save()
        })

        waitsFor(() => { return actual })

        runs(() => {
          expect(actual).toBe(expected)
          expect(actual).not.toBe(formatted)
        })
      })

      fit('formats the file on command', () => {
        let text = 'package main' + nl + nl + 'func main()  {' + nl + '}' + nl
        let unformatted = text
        let formatted = 'package main' + nl + nl + 'func main() {' + nl + '}' + nl

        runs(() => {
          let buffer = editor.getBuffer()
          buffer.setText(text)
          buffer.save()
        })

        waitsFor(() => {
          return actual
        })

        runs(() => {
          expect(actual).toBe(unformatted)
          expect(actual).not.toBe(formatted)
          let target = atom.views.getView(editor)
          atom.commands.dispatch(target, 'golang:gofmt')
        })

        runs(() => {
          expect(editor.getText()).toBe(formatted)
        })
      })
    })

    describe('when format on save is enabled and gofmt is the tool', () => {
      beforeEach(() => {
        atom.config.set('go-plus.format.formatOnSave', true)
        atom.config.set('go-plus.format.tool', 'gofmt')
      })

      it('formats the file on save', () => {
        let text = 'package main' + nl + nl + 'func main()  {' + nl + '}' + nl
        let expected = 'package main' + nl + nl + 'func main() {' + nl + '}' + nl

        runs(() => {
          let buffer = editor.getBuffer()
          buffer.setText(text)
          buffer.save()
        })

        waitsFor(() => {
          return actual
        })

        runs(() => {
          expect(actual).toBe(expected)
        })
      })
    })

    describe('when format on save is enabled and goimports is the tool', () => {
      beforeEach(() => {
        atom.config.set('go-plus.format.formatOnSave', true)
        atom.config.set('go-plus.format.tool', 'goimports')
      })

      it('formats the file on save', () => {
        let text = 'package main' + nl + nl + 'func main()  {' + nl + '}' + nl
        let expected = 'package main' + nl + nl + 'func main() {' + nl + '}' + nl

        runs(() => {
          let buffer = editor.getBuffer()
          buffer.setText(text)
          buffer.save()
        })

        waitsFor(() => {
          return actual
        })

        runs(() => {
          expect(actual).toBe(expected)
        })
      })
    })

    describe('when format on save is enabled and goreturns is the tool', () => {
      beforeEach(() => {
        atom.config.set('go-plus.format.formatOnSave', true)
        atom.config.set('go-plus.format.tool', 'goreturns')
      })

      it('formats the file on save', () => {
        let text = 'package main' + nl + nl + 'func main()  {' + nl + '}' + nl
        let expected = 'package main' + nl + nl + 'func main() {' + nl + '}' + nl

        runs(() => {
          let buffer = editor.getBuffer()
          buffer.setText(text)
          buffer.save()
        })

        waitsFor(() => {
          return actual
        })

        runs(() => {
          expect(actual).toBe(expected)
        })
      })
    })
  })
})

/*
path = require('path')
fs = require('fs-plus')
temp = require('temp').track()
_ = require('lodash')
AtomConfig = require('./util/atomconfig')

describe 'format', ->
  [mainModule, editor, dispatch, buffer, filePath] = []

  beforeEach ->
    atomconfig = new AtomConfig()
    atomconfig.allfunctionalitydisabled()
    directory = temp.mkdirSync()
    atom.project.setPaths(directory)
    filePath = path.join(directory, 'go-plus.go')
    fs.writeFileSync(filePath, '')
    jasmine.unspy(window, 'setTimeout')

    waitsForPromise -> atom.workspace.open(filePath).then (e) ->
      editor = e
      buffer = editor.getBuffer()

    waitsForPromise ->
      atom.packages.activatePackage('language-go')

    waitsForPromise -> atom.packages.activatePackage('go-plus').then (g) ->
      mainModule = g.mainModule

    waitsFor ->
      mainModule.dispatch?.ready

    runs ->
      dispatch = mainModule.dispatch

  describe 'when format on save is enabled', ->
    beforeEach ->
      atom.config.set('go-plus.format.formatOnSave', true)

    it 'reformats the file', ->
      done = false
      runs ->
        dispatch.once 'dispatch-complete', ->
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe('package main\n\nfunc main() {\n}\n')
          expect(dispatch.messages?).toBe(true)
          expect(_.size(dispatch.messages)).toBe(0)
          done = true
        buffer.setText('package main\n\nfunc main()  {\n}\n')
        buffer.save()

      waitsFor ->
        done is true

    it 'reformats the file after multiple saves', ->
      done = false
      displayDone = false

      runs ->
        dispatch.once 'dispatch-complete', ->
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe('package main\n\nfunc main() {\n}\n')
          expect(dispatch.messages?).toBe(true)
          expect(_.size(dispatch.messages)).toBe(0)
          done = true
        dispatch.once 'display-complete', ->
          displayDone = true
        buffer.setText('package main\n\nfunc main()  {\n}\n')
        buffer.save()

      waitsFor ->
        done is true

      waitsFor ->
        displayDone is true

      runs ->
        done = false
        dispatch.once 'dispatch-complete', ->
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe('package main\n\nfunc main() {\n}\n')
          expect(dispatch.messages?).toBe(true)
          expect(_.size(dispatch.messages)).toBe(0)
          done = true
        buffer.setText('package main\n\nfunc main()  {\n}\n')
        buffer.save()

      waitsFor ->
        done is true

    it 'collects errors when the input is invalid', ->
      done = false
      runs ->
        dispatch.once 'dispatch-complete', (editor) ->
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe('package main\n\nfunc main(!)  {\n}\n')
          expect(dispatch.messages?).toBe(true)
          expect(_.size(dispatch.messages)).toBe(1)
          expect(dispatch.messages[0].column).toBe('11')
          expect(dispatch.messages[0].line).toBe('3')
          expect(dispatch.messages[0].msg).toBe('expected type, found \'!\'')
          done = true
        buffer.setText('package main\n\nfunc main(!)  {\n}\n')
        buffer.save()

      waitsFor ->
        done is true

    it 'uses goimports to reorganize imports if enabled', ->
      done = false
      runs ->
        atom.config.set('go-plus.format.tool', 'goimports')
        dispatch.once 'dispatch-complete', ->
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe('package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, 世界")\n}\n')
          expect(dispatch.messages?).toBe(true)
          expect(_.size(dispatch.messages)).toBe(0)
          done = true
        buffer.setText('package main\n\nfunc main()  {\n\tfmt.Println("Hello, 世界")\n}\n')
        buffer.save()

      waitsFor ->
        done is true

    it 'uses goreturns to handle returns if enabled', ->
      done = false
      runs ->
        atom.config.set('go-plus.format.tool', 'goreturns')
        dispatch.once 'dispatch-complete', ->
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe('package demo\n\nimport "errors"\n\nfunc F() (string, int, error) {\n\treturn "", 0, errors.New("foo")\n}\n')
          expect(dispatch.messages?).toBe(true)
          expect(_.size(dispatch.messages)).toBe(0)
          done = true
        buffer.setText('package demo\n\nfunc F() (string, int, error)     {\nreturn errors.New("foo") }')
        buffer.save()

      waitsFor ->
        done is true

  describe 'when format on save is disabled', ->
    beforeEach ->
      atom.config.set('go-plus.format.formatOnSave', false)

    it 'does not reformat the file', ->
      done = false
      runs ->
        dispatch.once 'dispatch-complete', ->
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe('package main\n\nfunc main()  {\n}\n')
          expect(dispatch.messages?).toBe(true)
          expect(_.size(dispatch.messages)).toBe(0)
          done = true
        buffer.setText('package main\n\nfunc main()  {\n}\n')
        buffer.save()

      waitsFor ->
        done is true

*/
