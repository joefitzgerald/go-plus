path = require 'path'
fs = require 'fs-plus'
{WorkspaceView} = require 'atom'
temp = require 'temp'
_ = require 'underscore-plus'

describe "lint", ->
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

  describe "when lint on save is enabled", ->
    beforeEach ->
      atom.config.set("go-plus.formatOnSave", false)
      atom.config.set("go-plus.vetOnSave", false)
      atom.config.set("go-plus.lintOnSave", true)
      atom.config.set("go-plus.goPath", "/Users/jfitzgerald/go")
      atom.config.set("go-plus.environmentOverridesConfiguration", false)
      atom.config.set("go-plus.goExecutablePath", "/usr/local/go/bin/go")
      atom.config.set("go-plus.gofmtPath", "/usr/local/go/bin/gofmt")
      atom.config.set("go-plus.showErrorPanel", true)

    it "displays errors for missing documentation", ->
      done = false
      runs ->
        console.log 'Test File: ' + filePath
        buffer.setText("package main\n\nimport \"fmt\"\n\ntype T int\n\nfunc main()  {\nreturn\nfmt.Println(\"Unreachable...\")}\n")
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.on 'dispatch-complete', =>
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe "package main\n\nimport \"fmt\"\n\ntype T int\n\nfunc main()  {\nreturn\nfmt.Println(\"Unreachable...\")}\n"
          expect(dispatch.errorCollection?).toBe true
          expect(_.size(dispatch.errorCollection)).toBe 1
          expect(dispatch.errorCollection[0].column).toBe "6"
          expect(dispatch.errorCollection[0].line).toBe "5"
          expect(dispatch.errorCollection[0].msg).toBe "exported type T should have comment or be unexported"
          done = true
        buffer.save()

      waitsFor ->
        done is true
