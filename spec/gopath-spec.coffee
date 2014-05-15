path = require 'path'
fs = require 'fs-plus'
temp = require('temp').track()
{WorkspaceView} = require 'atom'
_ = require 'underscore-plus'

describe "gopath", ->
  [editor, directory, filePath, oldGoPath] = []

  beforeEach ->
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
      atom.config.set("go-plus.formatOnSave", false)
      atom.config.set("go-plus.vetOnSave", false)
      atom.config.set("go-plus.lintOnSave", false)
      atom.config.set("go-plus.goPath", directory)
      atom.config.set("go-plus.environmentOverridesConfiguration", true)
      atom.config.set("go-plus.syntaxCheckOnSave", true)
      atom.config.set("go-plus.goExecutablePath", "$GOROOT/bin/go")
      atom.config.set("go-plus.gofmtPath", "$GOROOT/bin/gofmt")
      atom.config.set("go-plus.showPanel", true)
      filePath = path.join(directory, "wrongsrc", "github.com", "testuser", "example", "go-plus.go")
      fs.writeFileSync(filePath, '')
      editor = atom.workspace.openSync(filePath)

      waitsForPromise ->
        atom.packages.activatePackage('language-go')

      waitsForPromise ->
        atom.packages.activatePackage('go-plus')

    it "displays a warning for a GOPATH without 'src' directory", ->
      done = false
      runs ->
        fs.unlinkSync(filePath)
        buffer = editor.getBuffer()
        buffer.setText("package main\n\nfunc main() {\n\treturn\n}\n")
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.on 'dispatch-complete', =>
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
        process.env['GOPATH']=path.join(directory, 'nonexistent')
        fs.unlinkSync(filePath)
        buffer = editor.getBuffer()
        buffer.setText("package main\n\nfunc main() {\n\treturn\n}\n")
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.on 'dispatch-complete', =>
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
      atom.config.set("go-plus.formatOnSave", false)
      atom.config.set("go-plus.vetOnSave", false)
      atom.config.set("go-plus.lintOnSave", false)
      atom.config.set("go-plus.goPath", "")
      atom.config.set("go-plus.environmentOverridesConfiguration", true)
      atom.config.set("go-plus.syntaxCheckOnSave", true)
      atom.config.set("go-plus.goExecutablePath", "$GOROOT/bin/go")
      atom.config.set("go-plus.gofmtPath", "$GOROOT/bin/gofmt")
      atom.config.set("go-plus.showPanel", true)
      filePath = path.join(directory, "wrongsrc", "github.com", "testuser", "example", "go-plus.go")
      fs.writeFileSync(filePath, '')
      editor = atom.workspace.openSync(filePath)

      waitsForPromise ->
        atom.packages.activatePackage('language-go')

      waitsForPromise ->
        atom.packages.activatePackage('go-plus')

    it "displays warnings for an unset GOPATH", ->
      done = false
      runs ->
        process.env['GOPATH']=''
        fs.unlinkSync(filePath)
        buffer = editor.getBuffer()
        buffer.setText("package main\n\nfunc main() {\n\treturn\n}\n")
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.on 'dispatch-complete', =>
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
