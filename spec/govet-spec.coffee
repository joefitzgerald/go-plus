path = require('path')
fs = require('fs-plus')
temp = require('temp').track()
_ = require('underscore-plus')
AtomConfig = require('./util/atomconfig')

describe 'vet', ->
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

  describe 'when vet on save is enabled', ->
    beforeEach ->
      atom.config.set('go-plus.vetOnSave', true)

    it 'displays errors for unreachable code', ->
      done = false
      runs ->
        buffer.setText('package main\n\nimport "fmt"\n\nfunc main()  {\nreturn\nfmt.Println("Unreachable...")}\n')
        dispatch.once 'dispatch-complete', ->
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe('package main\n\nimport "fmt"\n\nfunc main()  {\nreturn\nfmt.Println("Unreachable...")}\n')
          expect(dispatch.messages?).toBe(true)
          expect(_.size(dispatch.messages)).toBe(1)
          expect(dispatch.messages[0]).toBeDefined()
          expect(dispatch.messages[0].column).toBe(false)
          expect(dispatch.messages[0].line).toBe('7')
          expect(dispatch.messages[0].msg).toBe('unreachable code')
          done = true
        buffer.save()

      waitsFor ->
        done is true

    it 'allows vet args to be specified', ->
      done = false
      runs ->
        atom.config.set('go-plus.vetArgs', '-unreachable=true')
        buffer.setText('package main\n\nimport "fmt"\n\nfunc main()  {\nreturn\nfmt.Println("Unreachable...")}\n')
        dispatch.once 'dispatch-complete', ->
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe('package main\n\nimport "fmt"\n\nfunc main()  {\nreturn\nfmt.Println("Unreachable...")}\n')
          expect(dispatch.messages?).toBe(true)
          expect(_.size(dispatch.messages)).toBe(1)
          expect(dispatch.messages[0]).toBeDefined()
          expect(dispatch.messages[0].column).toBe(false)
          expect(dispatch.messages[0].line).toBe('7')
          expect(dispatch.messages[0].msg).toBe('unreachable code')
          done = true
        buffer.save()

      waitsFor ->
        done is true

  describe 'when vet on save and format on save are enabled', ->
    beforeEach ->
      atom.config.set('go-plus.formatOnSave', true)
      atom.config.set('go-plus.vetOnSave', true)

    it 'formats the file and displays errors for unreachable code', ->
      done = false
      runs ->
        buffer.setText('package main\n\nimport "fmt"\n\nfunc main()  {\nreturn\nfmt.Println("Unreachable...")}\n')
        dispatch.once 'dispatch-complete', ->
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe('package main\n\nimport "fmt"\n\nfunc main() {\n\treturn\n\tfmt.Println("Unreachable...")\n}\n')
          expect(dispatch.messages?).toBe(true)
          expect(_.size(dispatch.messages)).toBe(1)
          expect(dispatch.messages[0]).toBeDefined()
          expect(dispatch.messages[0].column).toBe(false)
          expect(dispatch.messages[0].line).toBe('7')
          expect(dispatch.messages[0].msg).toBe('unreachable code')
          done = true
        buffer.save()

      waitsFor ->
        done is true
