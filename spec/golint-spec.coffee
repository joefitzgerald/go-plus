path = require 'path'
fs = require 'fs-plus'
temp = require('temp').track()
_ = require 'underscore-plus'
AtomConfig = require './util/atomconfig'

describe "lint", ->
  [editor, dispatch, buffer, filePath, mainModule] = []

  beforeEach ->
    atomconfig = new AtomConfig()
    atomconfig.allfunctionalitydisabled()
    directory = temp.mkdirSync()
    atom.project.setPaths(directory)
    filePath = path.join(directory, 'go-plus.go')
    fs.writeFileSync(filePath, '')

    waitsForPromise -> atom.workspace.open(filePath).then (e) -> editor = e

    waitsForPromise ->
      atom.packages.activatePackage('language-go')

    waitsForPromise ->
      atom.packages.activatePackage('go-plus')
        .then (a) -> mainModule = a.mainModule

    runs ->
      buffer = editor.getBuffer()
      dispatch = mainModule.dispatch
      dispatch.goexecutable.detect()

    waitsFor ->
      dispatch.ready is true

  describe "when lint on save is enabled", ->
    beforeEach ->
      atom.config.set("go-plus.lintOnSave", true)

    it "displays errors for missing documentation", ->
      done = false
      runs ->
        buffer.setText("package main\n\nimport \"fmt\"\n\ntype T int\n\nfunc main()  {\nreturn\nfmt.Println(\"Unreachable...\")}\n")
        dispatch.once 'dispatch-complete', =>
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe "package main\n\nimport \"fmt\"\n\ntype T int\n\nfunc main()  {\nreturn\nfmt.Println(\"Unreachable...\")}\n"
          expect(dispatch.messages?).toBe true
          expect(_.size(dispatch.messages)).toBe 1
          expect(dispatch.messages[0].column).toBe "6"
          expect(dispatch.messages[0].line).toBe "5"
          expect(dispatch.messages[0].msg).toBe "exported type T should have comment or be unexported"
          done = true
        buffer.save()

      waitsFor ->
        done is true

    it "allows lint args to be specified", ->
      done = false
      runs ->
        atom.config.set("go-plus.golintArgs", "-min_confidence=0.8")
        buffer.setText("package main\n\nimport \"fmt\"\n\ntype T int\n\nfunc main()  {\nreturn\nfmt.Println(\"Unreachable...\")}\n")
        dispatch.once 'dispatch-complete', =>
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe "package main\n\nimport \"fmt\"\n\ntype T int\n\nfunc main()  {\nreturn\nfmt.Println(\"Unreachable...\")}\n"
          expect(dispatch.messages?).toBe true
          expect(_.size(dispatch.messages)).toBe 1
          expect(dispatch.messages[0].column).toBe "6"
          expect(dispatch.messages[0].line).toBe "5"
          expect(dispatch.messages[0].msg).toBe "exported type T should have comment or be unexported"
          done = true
        buffer.save()

      waitsFor ->
        done is true
