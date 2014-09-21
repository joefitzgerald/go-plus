{spawn} = require 'child_process'
temp = require 'temp'
path = require 'path'
fs = require 'fs-plus'
{Subscriber, Emitter} = require 'emissary'
GocoverParser = require './gocover/gocover-parser'
_ = require 'underscore-plus'

areas = []

module.exports =
class Gocover
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (dispatch) ->
    @dispatch = dispatch
    @name = 'gocover'
    @covering = false
    @parser = new GocoverParser()
    @coverageFile = false
    @ranges = false

    atom.workspaceView.command 'golang:gocover', => @runCoverageForCurrentEditorView()
    atom.workspaceView.command 'golang:cleargocover', => @clearMarkersFromEditors()
    atom.workspace.observeTextEditors (editor) =>
      @addMarkersToEditor(editor)

  destroy: ->
    @unsubscribe()
    @dispatch = null
    @parser = null
    @removeCoverageFile()

  addMarkersToEditors: =>
    editors = atom.workspace.getTextEditors()
    for editor in editors
      @addMarkersToEditor(editor)

  clearMarkersFromEditors: =>
    @removeCoverageFile()
    editors = atom.workspace.getTextEditors()
    for editor in editors
      @clearMarkers(editor)

  addMarkersToEditor: (editor) =>
    return unless editor?.getGrammar()?.scopeName is 'source.go'
    file = editor.getPath()
    buffer = editor.getBuffer()
    return unless file? and buffer?

    # Clear current markers
    @clearMarkers(editor)

    # Add new markers
    return unless @ranges? and @ranges and _.size(@ranges) > 0
    editorRanges = _.filter @ranges, (r) -> _.endsWith(file, r.file)
    for range in editorRanges
      marker = buffer.markRange(range.range, class: 'gocover', gocovercount: range.count, invalidate: 'touch')
      clazz = if range.count > 0 then 'covered' else 'uncovered'
      editor.decorateMarker(marker, type: 'highlight', class: clazz, onlyNonEmpty: true)

  clearMarkers: (editor) =>
    return unless editor?.getGrammar()?.scopeName is 'source.go'
    # Find current markers
    markers = editor.getBuffer()?.findMarkers(class: 'gocover')
    return unless markers? and _.size(markers) > 0
    # Remove markers
    marker.destroy() for marker in markers

  reset: (editorView) ->
    @emit 'reset', editorView

  removeCoverageFile: =>
    @ranges = []
    if @coverageFile
      try
        fs.unlinkSync @coverageFile
      catch
        return

  createCoverageFile: =>
    @removeCoverageFile()
    tempDir = temp.mkdirSync()
    @coverageFile = path.join(tempDir, 'coverage.out')

  runCoverageForCurrentEditorView: =>
    editorView = atom?.workspaceView?.getActiveView()
    return unless editorView?
    @reset editorView
    @runCoverage(editorView, false)

  runCoverage: (editorView, saving, callback = ->) =>
    unless @dispatch.isValidEditorView(editorView)
      @emit @name + '-complete', editorView, saving
      callback(null)
      return
    if saving and not atom.config.get('go-plus.runCoverageOnSave')
      @emit @name + '-complete', editorView, saving
      callback(null)
      return
    buffer = editorView?.getEditor()?.getBuffer()
    unless buffer?
      @emit @name + '-complete', editorView, saving
      callback(null)
      return

    if @covering
      @emit @name + '-complete', editorView, saving
      callback(null)
      return

    @covering = true
    @clearMarkersFromEditors()
    tempFile = @createCoverageFile()
    go = @dispatch.goexecutable.current()
    gopath = go.buildgopath()
    if not gopath? or gopath is ''
      @emit @name + '-complete', editorView, saving
      callback(null)
      return
    env = @dispatch.env()
    env['GOPATH'] = gopath
    re = new RegExp(buffer.getBaseName() + '$')
    go = @dispatch.goexecutable.current()
    cover = go.cover()
    if cover is false
      message =
        line: false
        column: false
        msg: 'Cover Tool Missing'
        type: 'error'
        source: @name
      @covering = false
      callback(null, [message])
      return
    cwd = buffer.getPath().replace(re, '')
    cmd = @dispatch.goexecutable.current().executable
    args = ["test", "-coverprofile=#{tempFile}"]
    done = (exitcode, stdout, stderr, messages) =>
      if exitcode is 0
        @ranges = @parser.ranges(tempFile)
        @addMarkersToEditors()
      @covering = false
      @emit @name + '-complete', editorView, saving
      callback(null, messages)
    @dispatch.executor.exec(cmd, cwd, env, done, args)

  resetCoverage: =>
    
