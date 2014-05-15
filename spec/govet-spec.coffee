path = require 'path'
fs = require 'fs-plus'
temp = require('temp').track()
{WorkspaceView} = require 'atom'
_ = require 'underscore-plus'

describe "vet", ->
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

  describe "when vet on save is enabled", ->
    beforeEach ->
      atom.config.set("go-plus.formatOnSave", false)
      atom.config.set("go-plus.vetOnSave", true)
      atom.config.set("go-plus.lintOnSave", false)
      atom.config.set("go-plus.environmentOverridesConfiguration", true)
      atom.config.set("go-plus.goExecutablePath", "$GOROOT/bin/go")
      atom.config.set("go-plus.gofmtPath", "$GOROOT/bin/gofmt")
      atom.config.set("go-plus.showPanel", true)

    it "displays errors for unreachable code", ->
      done = false
      runs ->
        buffer.setText("package main\n\nimport \"fmt\"\n\nfunc main()  {\nreturn\nfmt.Println(\"Unreachable...\")}\n")
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.on 'dispatch-complete', =>
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe "package main\n\nimport \"fmt\"\n\nfunc main()  {\nreturn\nfmt.Println(\"Unreachable...\")}\n"
          expect(dispatch.messages?).toBe true
          expect(_.size(dispatch.messages)).toBe 1
          expect(dispatch.messages[0].column).toBe false
          expect(dispatch.messages[0].line).toBe "7"
          expect(dispatch.messages[0].msg).toBe "unreachable code"
          done = true
        buffer.save()

      waitsFor ->
        done is true

  describe "when vet on save and format on save are enabled", ->
    beforeEach ->
      atom.config.set("go-plus.formatOnSave", true)
      atom.config.set("go-plus.vetOnSave", true)
      atom.config.set("go-plus.lintOnSave", false)
      atom.config.set("go-plus.environmentOverridesConfiguration", true)
      atom.config.set("go-plus.goExecutablePath", "$GOROOT/bin/go")
      atom.config.set("go-plus.gofmtPath", "$GOROOT/bin/gofmt")
      atom.config.set("go-plus.showPanel", true)

    it "formats the file and displays errors for unreachable code", ->
      done = false
      runs ->
        buffer.setText("package main\n\nimport \"fmt\"\n\nfunc main()  {\nreturn\nfmt.Println(\"Unreachable...\")}\n")
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.on 'dispatch-complete', =>
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe "package main\n\nimport \"fmt\"\n\nfunc main() {\n\treturn\n\tfmt.Println(\"Unreachable...\")\n}\n"
          expect(dispatch.messages?).toBe true
          expect(_.size(dispatch.messages)).toBe 1
          expect(dispatch.messages[0].column).toBe false
          expect(dispatch.messages[0].line).toBe "7"
          expect(dispatch.messages[0].msg).toBe "unreachable code"
          done = true
        buffer.save()

      waitsFor ->
        done is true
