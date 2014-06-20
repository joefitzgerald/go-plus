path = require 'path'
fs = require 'fs-plus'
temp = require('temp').track()
{WorkspaceView} = require 'atom'
_ = require 'underscore-plus'
AtomConfig = require './util/atomconfig'

describe "gocov", ->
  [atomconfig, editor, dispatch, testEditor, directory, filePath, testFilePath, oldGoPath] = []

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

  describe "when run coverage on save is enabled", ->
    ready = false
    beforeEach ->
      atom.config.set("go-plus.runCoverageOnSave", true)
      filePath = path.join(directory, "src", "github.com", "testuser", "example", "go-plus.go")
      testFilePath = path.join(directory, "src", "github.com", "testuser", "example", "go-plus_test.go")
      fs.writeFileSync(filePath, '')
      fs.writeFileSync(testFilePath, '')
      waitsForPromise -> atom.workspace.open(filePath).then (e) -> editor = e

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

    it "displays coverage for go source", ->
      done = false
      runs ->
        buffer = editor.getBuffer()
        buffer.setText("package main\n\nimport \"fmt\"\n\nfunc main()  {\n\tfmt.Println(Hello())\n}\n\nfunc Hello() string {\n\treturn \"Hello, 世界\"\n}\n")
        testBuffer = testEditor.getBuffer()
        testBuffer.setText("package main\n\nimport \"testing\"\n\nfunc TestHello(t *testing.T) {\n\tresult := Hello()\n\tif result != \"Hello, 世界\" {\n\t\tt.Errorf(\"Expected %s - got %s\", \"Hello, 世界\", result)\n\t}\n}")
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.once 'dispatch-complete', =>
          expect(dispatch.messages?).toBe true
          expect(_.size(dispatch.messages)).toBe 1
          dispatch.once 'dispatch-complete', =>
            expect(dispatch.messages?).toBe true
            console.log dispatch.messages
            expect(_.size(dispatch.messages)).toBe 0
            done = true
          testBuffer.save()
        buffer.save()

      waitsFor ->
        done is true
