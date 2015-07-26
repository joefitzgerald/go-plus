path = require('path')
fs = require('fs-plus')
temp = require('temp').track()
_ = require('underscore-plus')
PathHelper = require('./util/pathhelper')
AtomConfig = require('./util/atomconfig')

describe 'build', ->
  [mainModule, editor, dispatch, testEditor, directory, filePath, genFilePath, oldGoPath] = []

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

  describe 'when generate on save is enabled', ->
    beforeEach ->
      atom.config.set('go-plus.goPath', directory)
      atom.config.set('go-plus.generateOnSave', true)
      filePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'go-plus.go')
      genFilePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'go-plus-s.go')

      fs.writeFileSync(filePath, '')
      fs.writeFileSync(genFilePath, '')

      waitsForPromise ->
        atom.workspace.open(filePath).then((e) -> editor = e)

      waitsForPromise ->
        atom.workspace.open(genFilePath).then((e) -> testEditor = e)

      waitsForPromise ->
        atom.packages.activatePackage('language-go')

      waitsForPromise -> atom.packages.activatePackage('go-plus').then (g) ->
        mainModule = g.mainModule

      waitsFor ->
        mainModule.dispatch?.ready

      runs ->
        dispatch = mainModule.dispatch

    it "should generate the file when the comment is present", ->
      done = false
      runs ->
        fs.unlinkSync(filePath)
        fs.unlinkSync(genFilePath)
        editorBuffer = editor.getBuffer()
        editorBuffer.setText('package main\n\n//go:generate stringer -type=Pill -output go-plus-s.go\n\ntype Pill int\n\nconst (\n\nPlacebo Pill = iota\n\nAspirin\n\nIbuprofen\n\nParacetamol\n\nAcetaminophen = Paracetamol\n\n)')
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.once 'dispatch-complete', ->
          expect(fs.existsSync(genFilePath)).toBe(true)
          done = true
        editorBuffer.save()

      waitsFor ->
        done is true

    it "should not generate the file", ->
      done = false
      runs ->
        fs.unlinkSync(filePath)
        fs.unlinkSync(genFilePath)
        editorBuffer = editor.getBuffer()
        editorBuffer.setText('package main\n\ntype Pill int\n\nconst (\n\nPlacebo Pill = iota\n\nAspirin\n\nIbuprofen\n\nParacetamol\n\nAcetaminophen = Paracetamol\n\n)')
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.once 'dispatch-complete', ->
          expect(fs.existsSync(genFilePath)).toBe(false)
          done = true
        editorBuffer.save()

      waitsFor ->
        done is true
