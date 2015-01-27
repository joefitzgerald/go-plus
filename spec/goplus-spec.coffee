path = require 'path'
fs = require 'fs-plus'
temp = require('temp').track()
AtomConfig = require './util/atomconfig'

describe "Go Plus", ->
  [editor, dispatch, buffer, filePath, mainModule] = []

  beforeEach ->
    atomconfig = new AtomConfig()
    atomconfig.allfunctionalitydisabled()
    directory = temp.mkdirSync()
    atom.project.setPaths(directory)
    filePath = path.join(directory, 'go-plus.go')
    fs.writeFileSync(filePath, '')

    waitsForPromise -> atom.workspace.open(filePath).then (e) -> editor = e

    waitsForPromise ->
      atom.packages.activatePackage('language-go')

    waitsForPromise ->
      atom.packages.activatePackage('go-plus')
        .then (a) -> mainModule = a.mainModule

    runs ->
      buffer = editor.getBuffer()
      dispatch = mainModule.dispatch
      dispatch.goexecutable.detect()

    waitsFor ->
      dispatch.ready is true

  describe "when the editor is destroyed", ->
    beforeEach ->
      atom.config.set("go-plus.formatOnSave", true)
      editor.destroy()

    it "unsubscribes from the buffer", ->
      editor.destroy()
      done = false

      runs ->
        buffer.setText("package main\n\nfunc main()  {\n}\n")
        expect(editor.getGrammar().scopeName).toBe 'source.go'
        bufferSubscription = buffer.onDidSave ->
          bufferSubscription?.dispose()
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe "package main\n\nfunc main()  {\n}\n"
          done = true
        buffer.save()
        expect(buffer.getText()).toBe "package main\n\nfunc main()  {\n}\n"

      waits 500

      runs -> expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe "package main\n\nfunc main()  {\n}\n"

      waitsFor ->
        done is true
