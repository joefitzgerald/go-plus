module.exports =
  configDefaults:
    environmentOverridesConfiguration: true # Environment variables override configuration
    formatOnSave: true # Run gofmt or goimports on save
    formatWithGoImports: true # Use goimports instead of gofmt
    getMissingTools: true # go get -u missing tools
    # gofmtArgs: '-w' - Specify this in your user config if you need different args
    golintArgs: '' # Not usually needed
    goInstallation: '' # You should not need to specify this by default!
    goPath: '' # This should usually be set in the environment, not here
    lintOnSave: true # Run golint on save
    runCoverageOnSave: false # Run go test -coverprofile & cover on save
    showPanel: true
    showPanelWhenNoIssuesExist: false
    syntaxCheckOnSave: true # Run go build / go test on save
    vetArgs: ''
    vetOnSave: true # Run vet on save

  activate: (state) ->
    @dispatch = @createDispatch()

  deactivate: ->
    @dispatch?.destroy()
    @dispatch = null

  createDispatch: ->
    unless @dispatch?
      Dispatch = require './dispatch'
      @dispatch = new Dispatch()
