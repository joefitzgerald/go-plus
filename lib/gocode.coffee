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
    if editorView.attached and not editorView.mini
      editor = editorView.getModel()
      return unless @dispatch.isValidEditor(editor)
      provider = new GocodeProvider(editorView)
      @autocomplete.registerProviderForEditorView provider, editorView
      @providers.push(provider)

  deactivate: ->
    @editorSubscription?.off()
    @editorSubscription = null

    @providers.forEach (provider) =>
      @autocomplete.unregisterProvider provider

    @providers = []
