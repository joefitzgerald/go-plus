path = require 'path'
fs = require 'fs-plus'
temp = require('temp').track()
{WorkspaceView} = require 'atom'
_ = require 'underscore-plus'
AtomConfig = require './util/atomconfig'

describe "gopath", ->
  [editor, dispatch, directory, filePath, oldGoPath] = []

  beforeEach ->
    atomconfig = new AtomConfig()
    atomconfig.allfunctionalitydisabled()
    directory = temp.mkdirSync()
    oldGoPath = process.env.GOPATH
    process.env['GOPATH']=directory
    atom.project.setPath(directory)
    atom.workspaceView = new WorkspaceView()
    atom.workspace = atom.workspaceView.model

  afterEach ->
    process.env['GOPATH']=oldGoPath

  describe "when syntax check on save is enabled and goPath is set", ->
    beforeEach ->
      atom.config.set("go-plus.goPath", directory)
      atom.config.set("go-plus.syntaxCheckOnSave", true)
      filePath = path.join(directory, "wrongsrc", "github.com", "testuser", "example", "go-plus.go")
      fs.writeFileSync(filePath, '')

      waitsForPromise -> atom.workspace.open(filePath).then (e) -> editor = e

      waitsForPromise ->
        atom.packages.activatePackage('language-go')

      waitsForPromise ->
        atom.packages.activatePackage('go-plus')

      runs ->
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.goexecutable.detect()

      waitsFor ->
        dispatch.ready is true

    it "displays a warning for a GOPATH without 'src' directory", ->
      done = false
      runs ->
        fs.unlinkSync(filePath)
        buffer = editor.getBuffer()
        buffer.setText("package main\n\nfunc main() {\n\treturn\n}\n")
        dispatch.once 'dispatch-complete', =>
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe "package main\n\nfunc main() {\n\treturn\n}\n"
          expect(dispatch.messages?).toBe true
          expect(_.size(dispatch.messages)).toBe 1
          expect(dispatch.messages[0]?.column).toBe false
          expect(dispatch.messages[0]?.line).toBe false
          expect(dispatch.messages[0]?.msg).toBe "Warning: GOPATH [" + directory + "] does not contain a \"src\" directory - please review http://golang.org/doc/code.html#Workspaces"
          expect(dispatch.messages[0]?.type).toBe 'warning'
          done = true
        buffer.save()

      waitsFor ->
        done is true

    it "displays a warning for a non-existent GOPATH", ->
      done = false
      runs ->
        dispatch.goexecutable.current().gopath = path.join(directory, 'nonexistent')
        fs.unlinkSync(filePath)
        buffer = editor.getBuffer()
        buffer.setText("package main\n\nfunc main() {\n\treturn\n}\n")
        dispatch.once 'dispatch-complete', =>
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe "package main\n\nfunc main() {\n\treturn\n}\n"
          expect(dispatch.messages?).toBe true
          expect(_.size(dispatch.messages)).toBe 1
          expect(dispatch.messages[0]?.column).toBe false
          expect(dispatch.messages[0]?.line).toBe false
          expect(dispatch.messages[0]?.msg).toBe "Warning: GOPATH [" + path.join(directory, 'nonexistent') + "] does not exist"
          expect(dispatch.messages[0]?.type).toBe 'warning'
          done = true
        buffer.save()

      waitsFor ->
        done is true

  describe "when syntax check on save is enabled and GOPATH is not set", ->
    beforeEach ->
      atom.config.set("go-plus.goPath", "")
      atom.config.set("go-plus.syntaxCheckOnSave", true)
      filePath = path.join(directory, "wrongsrc", "github.com", "testuser", "example", "go-plus.go")
      fs.writeFileSync(filePath, '')

      waitsForPromise -> atom.workspace.open(filePath).then (e) -> editor = e

      waitsForPromise ->
        atom.packages.activatePackage('language-go')

      waitsForPromise ->
        atom.packages.activatePackage('go-plus')

      runs ->
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.goexecutable.detect()

      waitsFor ->
        dispatch.ready is true

    it "displays warnings for an unset GOPATH", ->
      done = false
      runs ->
        dispatch.goexecutable.current().env['GOPATH'] = ''
        dispatch.goexecutable.current().gopath = ''
        fs.unlinkSync(filePath)
        buffer = editor.getBuffer()
        buffer.setText("package main\n\nfunc main() {\n\treturn\n}\n")
        dispatch.once 'dispatch-complete', =>
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe "package main\n\nfunc main() {\n\treturn\n}\n"
          expect(dispatch.messages?).toBe true
          expect(_.size(dispatch.messages)).toBe 1
          expect(dispatch.messages[0]?.column).toBe false
          expect(dispatch.messages[0]?.line).toBe false
          expect(dispatch.messages[0]?.msg).toBe "Warning: GOPATH is not set – either set the GOPATH environment variable or define the Go Path in go-plus package preferences"
          expect(dispatch.messages[0]?.type).toBe 'warning'
          done = true
        buffer.save()

      waitsFor ->
        done is true
