path = require 'path'
fs = require 'fs-plus'
temp = require('temp').track()
{WorkspaceView} = require 'atom'
_ = require 'underscore-plus'
AtomConfig = require './util/atomconfig'

describe "build", ->
  [editor, dispatch, secondEditor, thirdEditor, testEditor, directory, filePath, secondFilePath, thirdFilePath, testFilePath, oldGoPath] = []

  beforeEach ->
    atomconfig = new AtomConfig()
    atomconfig.allfunctionalitydisabled()
    directory = temp.mkdirSync()
    oldGoPath = process.env.GOPATH
    oldGoPath = "~/go" unless process.env.GOPATH?
    process.env['GOPATH']=directory
    atom.project.setPath(directory)
    atom.workspaceView = new WorkspaceView()
    atom.workspace = atom.workspaceView.model

  afterEach ->
    process.env['GOPATH']=oldGoPath

  describe "when syntax check on save is enabled", ->
    ready = false
    beforeEach ->
      atom.config.set("go-plus.goPath", directory)
      atom.config.set("go-plus.syntaxCheckOnSave", true)
      filePath = path.join(directory, "src", "github.com", "testuser", "example", "go-plus.go")
      testFilePath = path.join(directory, "src", "github.com", "testuser", "example", "go-plus_test.go")
      fs.writeFileSync(filePath, '')
      fs.writeFileSync(testFilePath, '')
      editorPromise = atom.workspace.open(filePath)
      testEditorPromise = atom.workspace.open(testFilePath)

      waitsForPromise -> atom.workspace.open(filePath).then (e) -> editor = e

      waitsForPromise -> atom.workspace.open(testFilePath).then (e) -> testEditor = e

      waitsForPromise ->
        atom.packages.activatePackage('language-go')

      runs ->
        atom.packages.activatePackage('go-plus')

      runs ->
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.goexecutable.detect()

      waitsFor ->
        dispatch.ready is true

    it "displays errors for unused code", ->
      done = false
      runs ->
        fs.unlinkSync(testFilePath)
        buffer = editor.getBuffer()
        buffer.setText("package main\n\nimport \"fmt\"\n\nfunc main()  {\n42\nreturn\nfmt.Println(\"Unreachable...\")}\n")
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.once 'dispatch-complete', =>
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe "package main\n\nimport \"fmt\"\n\nfunc main()  {\n42\nreturn\nfmt.Println(\"Unreachable...\")}\n"
          expect(dispatch.messages?).toBe true
          expect(_.size(dispatch.messages)).toBe 1
          expect(dispatch.messages[0]?.column).toBe false
          expect(dispatch.messages[0]?.line).toBe "6"
          expect(dispatch.messages[0]?.msg).toBe "42 evaluated but not used"
          done = true
        buffer.save()

      waitsFor ->
        done is true

    it "displays errors for unused code in a test file", ->
      done = false
      runs ->
        fs.unlinkSync(filePath)
        testBuffer = testEditor.getBuffer()
        testBuffer.setText("package main\n\nimport \"testing\"\n\nfunc TestExample(t *testing.T) {\n\t42\n\tt.Error(\"Example Test\")\n}")
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.once 'dispatch-complete', =>
          expect(fs.readFileSync(testFilePath, {encoding: 'utf8'})).toBe "package main\n\nimport \"testing\"\n\nfunc TestExample(t *testing.T) {\n\t42\n\tt.Error(\"Example Test\")\n}"
          expect(dispatch.messages?).toBe true
          expect(_.size(dispatch.messages)).toBe 1
          expect(dispatch.messages[0]?.column).toBe false
          expect(dispatch.messages[0]?.line).toBe "6"
          expect(dispatch.messages[0]?.msg).toBe "42 evaluated but not used"
          done = true
        testBuffer.save()

      waitsFor ->
        done is true

  describe "when working with multiple files", ->
    beforeEach ->
      atom.config.set("go-plus.goPath", directory)
      atom.config.set("go-plus.syntaxCheckOnSave", true)
      filePath = path.join(directory, "src", "github.com", "testuser", "example", "go-plus.go")
      secondFilePath = path.join(directory, "src", "github.com", "testuser", "example", "util", "util.go")
      thirdFilePath = path.join(directory, "src", "github.com", "testuser", "example", "util", "strings.go")
      testFilePath = path.join(directory, "src", "github.com", "testuser", "example", "go-plus_test.go")
      fs.writeFileSync(filePath, '')
      fs.writeFileSync(secondFilePath, '')
      fs.writeFileSync(thirdFilePath, '')
      fs.writeFileSync(testFilePath, '')

      waitsForPromise -> atom.workspace.open(filePath).then (e) -> editor = e

      waitsForPromise -> atom.workspace.open(secondFilePath).then (e) -> secondEditor = e

      waitsForPromise -> atom.workspace.open(thirdFilePath).then (e) -> thirdEditor = e

      waitsForPromise -> atom.workspace.open(testFilePath).then (e) -> testEditor = e

      waitsForPromise ->
        atom.packages.activatePackage('language-go')

      waitsForPromise ->
        atom.packages.activatePackage('go-plus')

      runs ->
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.goexecutable.detect()

      waitsFor ->
        dispatch.ready is true

    it "does not display errors for dependent functions spread across multiple files in the same package", ->
      done = false
      runs ->
        buffer = editor.getBuffer()
        secondBuffer = secondEditor.getBuffer()
        thirdBuffer = thirdEditor.getBuffer()
        buffer.setText("package main\n\nimport \"fmt\"\nimport \"github.com/testuser/example/util\"\n\nfunc main() {\n\tfmt.Println(\"Hello, world!\")\n\tutil.ProcessString(\"Hello, world!\")\n}")
        secondBuffer.setText("package util\n\nimport \"fmt\"\n\n// ProcessString processes strings\nfunc ProcessString(text string) {\n\tfmt.Println(\"Processing...\")\n\tfmt.Println(Stringify(\"Testing\"))\n}")
        thirdBuffer.setText("package util\n\n// Stringify stringifies text\nfunc Stringify(text string) string {\n\treturn text + \"-stringified\"\n}")
        buffer.save()
        secondBuffer.save()
        thirdBuffer.save()
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.once 'dispatch-complete', =>
          expect(fs.readFileSync(secondFilePath, {encoding: 'utf8'})).toBe "package util\n\nimport \"fmt\"\n\n// ProcessString processes strings\nfunc ProcessString(text string) {\n\tfmt.Println(\"Processing...\")\n\tfmt.Println(Stringify(\"Testing\"))\n}"
          expect(dispatch.messages?).toBe true
          expect(_.size(dispatch.messages)).toBe 0
          done = true
        secondBuffer.save()

      waitsFor ->
        done is true
