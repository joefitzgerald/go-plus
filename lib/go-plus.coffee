Dispatch = require './dispatch'

module.exports =
  configDefaults:
    environmentOverridesConfiguration: true
    syntaxCheckOnSave: true
    formatOnSave: true
    formatWithGoImports: true
    getMissingTools: true
    gofmtArgs: '-w'
    vetOnSave: true
    vetArgs: ''
    lintOnSave: true
    goPath: ''
    golintArgs: ''
    runCoverageOnSave: false
    showPanel: true
    showPanelWhenNoIssuesExist: false

  activate: (state) ->
    @dispatch = new Dispatch()

  deactivate: ->
    @dispatch.destroy()
