spawn = require('child_process').spawn
{Subscriber, Emitter} = require 'emissary'
GocovAreaView = require './gocov/gocov-area-view'

areas = []

module.exports =
class Gocov
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (dispatch) ->
    atom.workspaceView.command 'golang:gocov', => @toggleCoverage()
    atom.workspaceView.eachEditorView (editorView) ->
      area = new GocovAreaView(editorView, dispatch)
      area.attach()
      areas.push area

    @dispatch = dispatch
    @name = 'cov'
    @covering = false

  destroy: ->
    @unsubscribe
    for area in areas
      area.destroy()

  coverageEnabled: ->
    @covering

  toggleCoverage: =>
    @covering = !@covering
    if @covering
      @runCoverage()
    else
      @resetCoverage()

  runCoverage: =>
    for area in areas
      area.processCoverageFile()

  resetCoverage: =>
    for area in areas
      area.removeMarkers()
