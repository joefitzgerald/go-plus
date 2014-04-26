GocovMarkerView = require './gocov-marker-view'
{EditorView, View, Range} = require 'atom'
_ = require 'underscore-plus'

module.exports =
class GocovAreaView extends View
  @content: ->
    @div class: 'golang-gocov'

  initialize: (editorView, dispatch) ->
    @views = []
    @editorView = editorView
    @dispatch = dispatch

  attach: =>
    @editorView.underlayer.append(this)
    atom.workspaceView.on 'pane:item-removed', @destroy

    if @dispatch.isValidEditorView(@editorView) and @dispatch.coverageEnabled()
      @processCoverageFile()

  destroy: =>
    found = false
    for editor in atom.workspaceView.getEditorViews()
      found = true if editor.id is @editorView.id
    return if found
    atom.workspaceView.off 'pane:item-removed', @destroy
    @unsubscribe()
    @remove()
    @detach()

  getEditorView: ->
    activeView = atom.workspaceView.getActiveView()
    if activeView instanceof EditorView then activeView else null

  getActiveEditor: ->
    atom.workspace.getActiveEditor()

  processCoverageFile: =>
    return unless @dispatch.isValidEditorView(@editorView)
    @removeMarkers()

    return unless editor = @getActiveEditor()

    # Need to build @ranges
    # The file we process is 1 based, we're expecting 0 based line numbers.
    @ranges = []

    for range in @ranges
      view = new GocovMarkerView(range, this, @getEditorView())
      @append view.element
      @views.push view

  removeMarkers: =>
    return unless @views?
    return if @views.length is 0
    for view in @views
      view.element.remove()
      view = null
    @views = []
