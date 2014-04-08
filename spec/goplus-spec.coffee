path = require 'path'
fs = require 'fs-plus'
temp = require('temp').track()
{WorkspaceView} = require 'atom'

describe "Go Plus", ->
  [editor, buffer, filePath] = []

  beforeEach ->
    directory = temp.mkdirSync()
    atom.project.setPath(directory)
    atom.workspaceView = new WorkspaceView()
    atom.workspace = atom.workspaceView.model
    filePath = path.join(directory, 'go-plus.go')
    fs.writeFileSync(filePath, '')
    editor = atom.workspace.openSync(filePath)
    buffer = editor.getBuffer()

    waitsForPromise ->
      atom.packages.activatePackage('language-go')

    waitsForPromise ->
      atom.packages.activatePackage('go-plus')

  describe "when the editor is destroyed", ->
    beforeEach ->
      editor.destroy()

    it "unsubscribes from the buffer", ->
      editor.destroy()
      done = false

      runs ->
        buffer.setText("package main\n\nfunc main()  {\n}\n")
        expect(editor.getGrammar().scopeName).toBe 'source.go'
        buffer.on 'saved', ->
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe "package main\n\nfunc main()  {\n}\n"
          done = true
        buffer.save()
        expect(buffer.getText()).toBe "package main\n\nfunc main()  {\n}\n"

      waits 500

      runs -> expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe "package main\n\nfunc main()  {\n}\n"

      waitsFor ->
        done is true
