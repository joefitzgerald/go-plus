module.exports =
  config:
    environmentOverridesConfiguration:
      title: 'Environment Overrides Config'
      description: 'Use the environment\'s value for GOPATH (if set) instead of the configured value for GOPATH (below)'
      type: 'boolean'
      default: true
      order: 1
    goPath:
      title: 'GOPATH'
      description: 'You should set your GOPATH in the environment, and launch Atom using the `atom` command line tool; if you would like to set it explicitly, you can do so here (e.g. ~/go)'
      type: 'string'
      default: '' # This should usually be set in the environment, not here
      order: 2
    goInstallation:
      title: 'Go Installation Path'
      description: 'You should not normally set this; if you have a non-standard go installation path and `go` is not available on your PATH, you can use this to configure the location to `go` (e.g. /usr/local/othergo/bin/go or c:\\othergo\\bin\\go.exe)'
      type: 'string'
      default: '' # You should not need to specify this by default!
      order: 3
    formatOnSave:
      title: 'Run Format Tool On Save'
      description: 'Run the configured format tool each time a file is saved'
      type: 'boolean'
      default: true
      order: 4
    formatTool:
      title: 'Format Tool'
      description: 'Choose one: goimports, goreturns, or gofmt'
      type: 'string'
      default: 'goimports'
      enum: ['goimports', 'goreturns', 'gofmt']
      order: 5
    formatArgs:
      title: 'Format Arguments'
      description: '`-w` will always be used; you can specify additional arguments for the format tool if desired'
      type: 'string'
      default: '-w -e'
      order: 6
    lintOnSave:
      title: 'Run Lint Tool On Save'
      description: 'Run `golint` each time a file is saved'
      type: 'boolean'
      default: true
      order: 7
    golintArgs:
      title: 'Lint Arguments'
      description: 'Arguments to pass to `golint` (these are not usually needed)'
      type: 'string'
      default: ''
      order: 8
    runCoverageOnSave:
      title: 'Run Coverage Tool On Save'
      description: 'Run `go test -coverprofile` each time a file is saved'
      type: 'boolean'
      default: false
      order: 9
    syntaxCheckOnSave:
      title: 'Run Syntax Check On Save'
      description: 'Run `go build` / `go test` each time a file is saved'
      type: 'boolean'
      default: true
      order: 10
    vetOnSave:
      title: 'Run Vet Tool On Save'
      description: 'Run `go vet` each time a file is saved'
      type: 'boolean'
      default: true
      order: 11
    vetArgs:
      title: 'Vet Arguments'
      description: 'Arguments to pass to `go vet` (these are not usually needed)'
      type: 'string'
      default: ''
      order: 12
    getMissingTools:
      title: 'Automatically Get Missing Tools'
      description: 'Run `go get -u` to retrieve any tools that are required but not currently available in the go tool directory, the PATH, or your GOPATH'
      type: 'boolean'
      default: true
      order: 13
    showPanel:
      title: 'Show Message Panel'
      description: 'Show the go-plus message panel to provide information about issues with your source'
      type: 'boolean'
      default: true
      order: 14
    showPanelWhenNoIssuesExist:
      title: 'Show Message Panel When No Issues Exist'
      description: 'Show the go-plus message panel even when no issues exist'
      type: 'boolean'
      default: false
      order: 15
    autocompleteBlacklist:
      title: 'Autocomplete Scope Blacklist'
      description: 'Autocomplete suggestions will not be shown when the cursor is inside the following comma-delimited scope(s).'
      type: 'string'
      default: '.source.go .comment'
      order: 16
    suppressBuiltinAutocompleteProvider:
      title: 'Suppress Built-In Autocomplete Plus Provider'
      description: 'Suppress the provider built-in to the autocomplete-plus package when editing .go files.'
      type: 'boolean'
      default: true
      order: 17
    suppressAutocompleteActivationForCharacters:
      title: 'Suppress Autocomplete Activation For Characters'
      description: 'Suggestions will not be provided when you type one of these characters.'
      type: 'array'
      default: [
        'comma', 'newline', 'space', 'tab', '/', '\\', '(', ')', '"', '\'', ':',
        ';', '<', '>', '~', '!', '@', '#', '$', '%', '^', '&', '*', '|', '+',
        '=', '[', ']', '{', '}', '`', '~', '?', '-'
      ]
      items:
        type: 'string'
      order: 18

  activate: (state) ->
    run = =>
      @getDispatch()
    setTimeout(run.bind(this), 0)

  deactivate: ->
    @provider?.dispose()
    @provider = null
    @dispatch?.destroy()
    @dispatch = null

  getDispatch: ->
    return @dispatch if @dispatch?
    Dispatch = require('./dispatch')
    @dispatch = new Dispatch()
    @setDispatch()
    return @dispatch

  setDispatch: ->
    @provider.setDispatch(@dispatch) if @provider? and @dispatch?

  getProvider: ->
    return @provider if @provider?
    GocodeProvider = require('./gocodeprovider')
    @provider = new GocodeProvider()
    @setDispatch()
    return @provider

  provide: ->
    return @getProvider()
