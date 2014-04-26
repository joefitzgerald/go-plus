spawn = require('child_process').spawn
{Subscriber, Emitter} = require 'emissary'
GocovAreaView = require './gocov-area-view'

areas = []

module.exports =
class Gocov
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (dispatch) ->
    atom.workspaceView.eachEditorView (editorView) ->
      area = new GocovAreaView(editorView)
      area.attach()
      areas.push = area

    #atom.workspaceView.command 'golang:gofmt', => @formatCurrentBuffer()
    @dispatch = dispatch
    @name = 'cov'

  destroy: ->
    @unsubscribe
    for area in areas
      area.destroy()

  runCoverage: (editorView) ->
    # Set up some fake views and such
    console.log "Running gocov"
