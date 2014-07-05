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
    atom.workspace.eachEditor (editor) =>
      if atom.config.get('core.useReactEditor')?
        @addMarkersToEditor(editor)

  destroy: ->
    @unsubscribe()
    @removeCoverageFile()

  addMarkersToEditors: =>
    editors = atom.workspace.getEditors()
    for editor in editors
      @addMarkersToEditor(editor)

  addMarkersToEditor: (editor) =>
    return unless editor?
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
      editor.addDecorationForMarker(marker, type: 'highlight', class: clazz, onlyNonEmpty: true)

  clearMarkers: (editor) =>
    return unless editor?
    # Find current markers
    markers = editor.getBuffer()?.findMarkers(class: 'gocover')
    return unless markers? and _.size(markers) > 0
    # Remove markers
    marker.destroy() for marker in markers

  reset: (editorView) ->
    @emit 'reset', editorView

  removeCoverageFile: =>
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
    editorView = atom.workspaceView.getActiveView()
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
    cwd = buffer.getPath().replace(re, '')
    cmd = @dispatch.goexecutable.current().executable
    args = ["test", "-coverprofile=#{tempFile}"]
    done = (exitcode, stdout, stderr, messages) =>
      if exitcode is 0
        @ranges = @parser.ranges(tempFile)
        if atom.config.get('core.useReactEditor')?
          @addMarkersToEditors()
      @covering = false
      @emit @name + '-complete', editorView, saving
      callback(null, messages)
    @dispatch.executor.exec(cmd, cwd, env, done, args)

  resetCoverage: =>
    unless atom.config.get('core.useReactEditor')?
      for area in areas
        area.removeMarkers()
