path = require 'path'
fs = require 'fs-plus'
{WorkspaceView} = require 'atom'
temp = require 'temp'
Gofmt = require '../lib/gofmt'

describe "Dispatch", ->
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

  describe "when format on save is enabled", ->
    beforeEach ->
      atom.config.set("go-plus.formatOnSave", true)
      atom.config.set("go-plus.vetOnSave", false)
      atom.config.set("go-plus.goPath", "/usr/local/go/bin/go")
      atom.config.set("go-plus.gofmtPath", "/usr/local/go/bin/gofmt")
      atom.config.set("go-plus.showErrorPanel", false)

    it "reformats the file", ->
      done = false
      runs ->
        console.log 'Test File: ' + filePath
        buffer.setText("package main\n\nfunc main()  {\n}\n")
        buffer.on 'reloaded', ->
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe "package main\n\nfunc main() {\n}\n"
          done = true
        buffer.save()

      waitsFor ->
        done is true

  describe "when format on save is disabled", ->
    beforeEach ->
      atom.config.set("go-plus.formatOnSave", false)
      atom.config.set("go-plus.vetOnSave", false)
      atom.config.set("go-plus.goPath", "/usr/local/go/bin/go")
      atom.config.set("go-plus.gofmtPath", "/usr/local/go/bin/gofmt")
      atom.config.set("go-plus.showErrorPanel", false)

    it "does not reformat the file", ->
      done = false
      runs ->
        console.log 'Test File: ' + filePath
        buffer.setText("package main\n\nfunc main()  {\n}\n")
        buffer.on 'saved', ->
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe "package main\n\nfunc main()  {\n}\n"
          done = true
        buffer.save()

      waits 500

      runs -> expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe "package main\n\nfunc main()  {\n}\n"

      waitsFor ->
        done is true
