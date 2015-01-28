{CompositeDisposable} = require 'event-kit'
_ = require 'underscore-plus'
GocodeProvider = require './gocodeprovider'

module.exports =
class Gocode
  constructor: (dispatch) ->
    @name = 'gocode'
    @subscriptions = new CompositeDisposable
    @dispatch = dispatch
    @provider = new GocodeProvider(@dispatch)
    @subscriptions.add(@provider)
    @registration = atom.services.provide('autocomplete.provider', '1.0.0', {@provider})
    @subscriptions.add(@registration)

  dispose: ->
    @subscriptions?.dispose()
    @registration = null
    @provider = null
    @dispatch = null
