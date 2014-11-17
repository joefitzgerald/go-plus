{Subscriber, Emitter} = require 'emissary'
_ = require 'underscore-plus'

module.exports =
class Gocode
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (dispatch) ->
    @dispatch = dispatch
    @name = 'gocode'
    @editorSubscription = null
    @autocomplete = null
    @providers = []
    @activate()

  destroy: ->
    @deactivate()
    @unsubscribe()
    @dispatch = null

  reset: (editor) ->
    @emit 'reset', editor

  activate: ->
    return unless _.contains(atom.packages.getAvailablePackageNames(), 'autocomplete-plus')
    atom.packages.activatePackage("autocomplete-plus")
      .then (pkg) =>
        @autocomplete = pkg.mainModule
        GocodeProvider = (require './gocodeprovider')
          .ProviderClass(@autocomplete.Provider, @autocomplete.Suggestion, @dispatch)

        @editorSubscription = atom.workspaceView.eachEditorView((editorView) => @registerProvider(GocodeProvider, editorView))

  registerProvider: (GocodeProvider, editorView) =>
    console.log 'Registering Provider'
    if editorView.attached and not editorView.mini
      editor = editorView.getModel()
      return unless @dispatch.isValidEditor(editor)
      console.log 'Creating Provider'
      provider = new GocodeProvider(editorView)
      # provider.editor = editor
      @autocomplete.registerProviderForEditorView provider, editorView
      @providers.push(provider)
      console.log 'Registered Provider'

  deactivate: ->
    @editorSubscription?.dispose()
    @editorSubscription = null

    @providers.forEach (provider) =>
      @autocomplete.unregisterProvider provider

    @providers = []
