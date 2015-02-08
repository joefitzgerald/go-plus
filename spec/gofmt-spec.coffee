path = require('path')
fs = require('fs-plus')
temp = require('temp').track()
_ = require('underscore-plus')
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
      atom.config.set('go-plus.formatOnSave', true)

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
        atom.config.set('go-plus.formatTool', 'goimports')
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
        atom.config.set('go-plus.formatTool', 'goreturns')
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
      atom.config.set('go-plus.formatOnSave', false)

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
