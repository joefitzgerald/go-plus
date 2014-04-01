Dispatch = require './dispatch'

module.exports =
  configDefaults:
    environmentOverridesConfiguration: true
    syntaxCheckOnSave: false
    formatOnSave: true
    vetOnSave: true
    goPath: ""
    goExecutablePath: "/usr/local/go/bin/go"
    gofmtPath: "/usr/local/go/bin/gofmt"
    showErrorPanel: true

  activate: (state) ->
    @dispatch = new Dispatch()

  deactivate: ->
    @dispatch.destroy()
