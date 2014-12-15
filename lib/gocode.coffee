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

        @editorSubscription = atom.workspace.observeTextEditors((editor) => @registerProvider(GocodeProvider, editor))

  registerProvider: (GocodeProvider, editor) =>
    return unless @dispatch.isValidEditor(editor)
    provider = new GocodeProvider(editor)
    @autocomplete.registerProviderForEditor provider, editor
    @providers.push(provider)

  deactivate: ->
    @editorSubscription?.dispose()
    @editorSubscription = null

    @providers.forEach (provider) =>
      @autocomplete.unregisterProvider provider

    @providers = []
