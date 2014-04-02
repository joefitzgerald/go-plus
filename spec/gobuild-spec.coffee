path = require 'path'
fs = require 'fs-plus'
{WorkspaceView} = require 'atom'
temp = require 'temp'
_ = require 'underscore-plus'

describe "build", ->
  [editor, testEditor, directory, filePath, testFilePath] = []

  beforeEach ->
    directory = temp.mkdirSync()
    atom.project.setPath(directory)
    atom.workspaceView = new WorkspaceView()
    atom.workspace = atom.workspaceView.model
    filePath = path.join(directory, "src", "github.com", "testuser", "example", "go-plus.go")
    testFilePath = path.join(directory, "src", "github.com", "testuser", "example", "go-plus_test.go")
    fs.writeFileSync(filePath, '')
    fs.writeFileSync(testFilePath, '')
    editor = atom.workspace.openSync(filePath)
    testEditor = atom.workspace.openSync(testFilePath)

    waitsForPromise ->
      atom.packages.activatePackage('language-go')

    waitsForPromise ->
      atom.packages.activatePackage('go-plus')

  describe "when syntax check on save is enabled", ->
    beforeEach ->
      atom.config.set("go-plus.formatOnSave", false)
      atom.config.set("go-plus.vetOnSave", false)
      atom.config.set("go-plus.lintOnSave", false)
      atom.config.set("go-plus.goPath", directory)
      atom.config.set("go-plus.syntaxCheckOnSave", true)
      atom.config.set("go-plus.goExecutablePath", "/usr/local/go/bin/go")
      atom.config.set("go-plus.gofmtPath", "/usr/local/go/bin/gofmt")
      atom.config.set("go-plus.showErrorPanel", true)

    it "displays errors for unused code", ->
      done = false
      runs ->
        console.log 'Test File: ' + filePath
        buffer = editor.getBuffer()
        buffer.setText("package main\n\nimport \"fmt\"\n\nfunc main()  {\n42\nreturn\nfmt.Println(\"Unreachable...\")}\n")
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.on 'dispatch-complete', =>
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe "package main\n\nimport \"fmt\"\n\nfunc main()  {\n42\nreturn\nfmt.Println(\"Unreachable...\")}\n"
          expect(dispatch.errorCollection?).toBe true
          expect(_.size(dispatch.errorCollection)).toBe 1
          expect(dispatch.errorCollection[0].column).toBe false
          expect(dispatch.errorCollection[0].line).toBe "6"
          expect(dispatch.errorCollection[0].msg).toBe "42 evaluated but not used"
          done = true
        buffer.save()

      waitsFor ->
        done is true

    it "displays errors for unused code in a test file", ->
      done = false
      runs ->
        console.log 'Test File: ' + testFilePath
        testBuffer = testEditor.getBuffer()
        testBuffer.setText("package main\n\nimport \"testing\"\n\nfunc TestExample(t *testing.T) {\n\t42\n\tt.Error(\"Example Test\")\n}")
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.on 'dispatch-complete', =>
          expect(fs.readFileSync(testFilePath, {encoding: 'utf8'})).toBe "package main\n\nimport \"testing\"\n\nfunc TestExample(t *testing.T) {\n\t42\n\tt.Error(\"Example Test\")\n}"
          expect(dispatch.errorCollection?).toBe true
          expect(_.size(dispatch.errorCollection)).toBe 1
          expect(dispatch.errorCollection[0].column).toBe false
          expect(dispatch.errorCollection[0].line).toBe "6"
          expect(dispatch.errorCollection[0].msg).toBe "42 evaluated but not used"
          done = true
        testBuffer.save()

      waitsFor ->
        done is true
