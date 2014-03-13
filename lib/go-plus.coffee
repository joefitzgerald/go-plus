Gofmt = require './gofmt'

module.exports =
  configDefaults:
    formatOnSave: true
    gofmtPath: "/usr/local/go/bin/gofmt"
    showErrorPanel: true

  activate: (state) ->
    @gofmt = new Gofmt()
    atom.workspaceView.command "golang:gofmt", => @gofmt.formatCurrentBuffer()

  deactivate: ->
    @gofmt.destroy()
