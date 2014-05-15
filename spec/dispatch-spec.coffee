path = require 'path'
fs = require 'fs-plus'
temp = require('temp').track()
{WorkspaceView} = require 'atom'
_ = require 'underscore-plus'

describe "dispatch", ->
  [editor, buffer, filePath, dispatch] = []

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

  describe "when gopath has multiple values and gofmtPath has a $GOPATH token", ->
    beforeEach ->
      dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
      atom.config.set("go-plus.formatOnSave", false)
      atom.config.set("go-plus.vetOnSave", false)
      atom.config.set("go-plus.lintOnSave", false)
      atom.config.set("go-plus.goPath", "~/go:/path/to/someother/gopath")
      atom.config.set("go-plus.environmentOverridesConfiguration", false)
      atom.config.set("go-plus.goExecutablePath", "$GOROOT/bin/go")
      atom.config.set("go-plus.gofmtPath", "$GOPATH/bin/goimports")
      atom.config.set("go-plus.showPanel", true)

    it "replaces the $GOPATH token with the first element from the gopath", ->
      cmd = atom.config.get('go-plus.gofmtPath')
      cmd = dispatch.replaceTokensInPath(cmd)
      expect(cmd).toBe path.join(process.env.HOME, "go", "bin", "goimports")

  describe "when gopath has a single value and gofmtPath has a $GOPATH token", ->
    beforeEach ->
      dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
      atom.config.set("go-plus.formatOnSave", false)
      atom.config.set("go-plus.vetOnSave", false)
      atom.config.set("go-plus.lintOnSave", false)
      atom.config.set("go-plus.goPath", "~/go")
      atom.config.set("go-plus.environmentOverridesConfiguration", true)
      atom.config.set("go-plus.goExecutablePath", "$GOROOT/bin/go")
      atom.config.set("go-plus.gofmtPath", "$GOPATH/bin/goimports")
      atom.config.set("go-plus.showPanel", true)

    it "replaces the $GOPATH token with the first element from the gopath", ->
      cmd = atom.config.get('go-plus.gofmtPath')
      cmd = dispatch.replaceTokensInPath(cmd)
      expect(cmd).toBe path.join(dispatch.buildGoPath(), "bin", "goimports")
