path = require('path')
fs = require('fs-plus')
temp = require('temp').track()
_ = require('underscore-plus')
PathHelper = require('./util/pathhelper')
AtomConfig = require('./util/atomconfig')

describe 'gocover', ->
  [mainModule, atomconfig, editor, dispatch, testEditor, directory, filePath, testFilePath, oldGoPath, pathhelper] = []

  beforeEach ->
    atomconfig = new AtomConfig()
    pathhelper = new PathHelper()
    atomconfig.allfunctionalitydisabled()
    directory = temp.mkdirSync()
    oldGoPath = process.env.GOPATH
    oldGoPath = pathhelper.home() + path.sep + 'go' unless process.env.GOPATH?
    process.env['GOPATH'] = directory
    atom.project.setPaths(directory)
    jasmine.unspy(window, 'setTimeout')

  afterEach ->
    process.env['GOPATH'] = oldGoPath

  describe 'when run coverage on save is enabled', ->
    ready = false
    beforeEach ->
      atom.config.set('go-plus.runCoverageOnSave', true)
      filePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'go-plus.go')
      testFilePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'go-plus_test.go')
      fs.writeFileSync(filePath, '')
      fs.writeFileSync(testFilePath, '')
      waitsForPromise ->
        atom.workspace.open(filePath).then((e) -> editor = e)

      waitsForPromise ->
        atom.workspace.open(testFilePath).then((e) -> testEditor = e)

      waitsForPromise ->
        atom.packages.activatePackage('language-go')

      waitsForPromise -> atom.packages.activatePackage('go-plus').then (g) ->
        mainModule = g.mainModule

      waitsFor ->
        mainModule.dispatch?.ready

      runs ->
        dispatch = mainModule.dispatch

    it 'displays coverage for go source', ->
      [buffer] = []
      done = false
      runs ->
        buffer = editor.getBuffer()
        buffer.setText('package main\n\nimport "fmt"\n\nfunc main()  {\n\tfmt.Println(Hello())\n}\n\nfunc Hello() string {\n\treturn "Hello, 世界"\n}\n')
        testBuffer = testEditor.getBuffer()
        testBuffer.setText('package main\n\nimport "testing"\n\nfunc TestHello(t *testing.T) {\n\tresult := Hello()\n\tif result != "Hello, 世界" {\n\t\tt.Errorf("Expected %s - got %s", "Hello, 世界", result)\n\t}\n}')
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.once 'coverage-complete', ->
          expect(dispatch.messages?).toBe(true)
          expect(_.size(dispatch.messages)).toBe(0)
          dispatch.once 'coverage-complete', ->
            expect(dispatch.messages?).toBe(true)
            expect(_.size(dispatch.messages)).toBe(0)
            markers = buffer.findMarkers({class: 'gocover'})
            expect(markers).toBeDefined()

            expect(markers.length).toBe(2)
            expect(markers[0]).toBeDefined()
            range = markers[0].getRange()
            expect(range.start.row).toBe(4)
            expect(range.start.column).toBe(13)
            expect(range.end.row).toBe(6)
            expect(range.end.column).toBe(1)

            expect(markers[1]).toBeDefined()
            range = markers[1].getRange()
            expect(range).toBeDefined()
            expect(range.start.row).toBe(8)
            expect(range.start.column).toBe(20)
            expect(range.end.row).toBe(10)
            expect(range.end.column).toBe(1)
            done = true
          testBuffer.save()
        buffer.save()

      waitsFor ->
        done is true
