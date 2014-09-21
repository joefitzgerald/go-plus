path = require 'path'
fs = require 'fs-plus'
temp = require('temp').track()
{WorkspaceView} = require 'atom'
_ = require 'underscore-plus'
PathHelper = require './util/pathhelper'
AtomConfig = require './util/atomconfig'

describe "gocover", ->
  [atomconfig, editor, dispatch, testEditor, directory, filePath, testFilePath, oldGoPath, pathhelper] = []

  beforeEach ->
    atomconfig = new AtomConfig()
    pathhelper = new PathHelper()
    atomconfig.allfunctionalitydisabled()
    directory = temp.mkdirSync()
    oldGoPath = process.env.GOPATH
    oldGoPath = pathhelper.home() + path.sep + 'go' unless process.env.GOPATH?
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
        dispatch.once 'coverage-complete', =>
          expect(dispatch.messages?).toBe true
          expect(_.size(dispatch.messages)).toBe 0
          dispatch.once 'coverage-complete', =>
            expect(dispatch.messages?).toBe true
            expect(_.size(dispatch.messages)).toBe 0
            markers = buffer.findMarkers(class: 'gocover')
            expect(markers).toBeDefined()
            expect(_.size(markers)).toBe 2
            expect(markers[0]).toBeDefined
            expect(markers[0].range).toBeDefined
            expect(markers[0].range.start.row).toBe 4
            expect(markers[0].range.start.column).toBe 13
            expect(markers[0].range.end.row).toBe 6
            expect(markers[0].range.end.column).toBe 1
            expect(markers[1]).toBeDefined
            expect(markers[1].range).toBeDefined
            expect(markers[1].range.start.row).toBe 8
            expect(markers[1].range.start.column).toBe 20
            expect(markers[1].range.end.row).toBe 10
            expect(markers[1].range.end.column).toBe 1
            done = true
          testBuffer.save()
        buffer.save()

      waitsFor ->
        done is true
