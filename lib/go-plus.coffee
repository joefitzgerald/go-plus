Dispatch = require './dispatch'

module.exports =
  configDefaults:
    environmentOverridesConfiguration: true
    syntaxCheckOnSave: false
    formatOnSave: true
    gofmtArgs: "-w"
    vetOnSave: true
    vetArgs: ""
    lintOnSave: false
    goPath: ""
    goExecutablePath: "/usr/local/go/bin/go"
    gofmtPath: "/usr/local/go/bin/gofmt"
    golintPath: "$GOPATH/bin/golint"
    golintArgs: ""
    runCoverageOnSave: false
    showPanel: true
    showPanelWhenNoIssuesExist: false

  activate: (state) ->
    @dispatch = new Dispatch()

  deactivate: ->
    @dispatch.destroy()
