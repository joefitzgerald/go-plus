spawn = require('child_process').spawn
{Subscriber, Emitter} = require 'emissary'
GocovAreaView = require './gocov/gocov-area-view'
GocovParser = require './gocov/gocov-parser'

areas = []

module.exports =
class Gocov
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (dispatch) ->
    @dispatch = dispatch
    @name = 'cov'
    @covering = false
    @parser = new GocovParser(dispatch)

    atom.workspaceView.command 'golang:gocov', => @toggleCoverage()
    atom.workspaceView.eachEditorView (editorView) =>
      area = new GocovAreaView(editorView, this)
      area.attach()
      areas.push area

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

  isValidEditorView: (editorView) =>
    @dispatch.isValidEditorView(editorView)

  rangesForFile: (path) =>
    @parser.rangesForFile(path)
