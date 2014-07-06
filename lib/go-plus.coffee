Dispatch = require './dispatch'

module.exports =
  configDefaults:
    environmentOverridesConfiguration: true
    formatOnSave: true
    formatWithGoImports: true
    getMissingTools: true
    # gofmtArgs: '-w' - Specify This In Your User Config If You Need Different Args
    golintArgs: ''
    goPath: ''
    lintOnSave: true
    runCoverageOnSave: false
    showPanel: true
    showPanelWhenNoIssuesExist: false
    syntaxCheckOnSave: true
    vetArgs: ''
    vetOnSave: true

  activate: (state) ->
    @dispatch = new Dispatch()

  deactivate: ->
    @dispatch.destroy()
