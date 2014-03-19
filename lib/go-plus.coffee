Dispatch = require './dispatch'

module.exports =
  configDefaults:
    formatOnSave: true
    # vetOnSave: true
    goPath: "/usr/local/go/bin/go"
    gofmtPath: "/usr/local/go/bin/gofmt"
    showErrorPanel: true

  activate: (state) ->
    @dispatch = new Dispatch()

  deactivate: ->
    @dispatch.destroy()
