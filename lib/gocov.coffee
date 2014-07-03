{spawn} = require 'child_process'
temp = require 'temp'
path = require 'path'
fs = require 'fs-plus'
{Subscriber, Emitter} = require 'emissary'
GocovAreaView = require './gocov/gocov-area-view'
GocovParser = require './gocov/gocov-parser'
_ = require 'underscore-plus'

areas = []

module.exports =
class Gocov
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (dispatch) ->
    @dispatch = dispatch
    @name = 'gocov'
    @covering = false
    @parser = new GocovParser()
    @coverageFile = false

    atom.workspaceView.command 'golang:gocov', => @runCoverageForCurrentEditorView()
    atom.workspaceView.eachEditorView (editorView) =>
      area = new GocovAreaView(editorView, this)
      area.attach()
      areas.push area
      editorView.on 'destroyed', =>
        old = _.find areas, (a) -> a.editorView is editorView
        areas = _.filter areas, (a) -> a isnt old
        old.destroy()

  destroy: ->
    @unsubscribe()
    @removeCoverageFile()
    for area in areas
      area.destroy()

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

  emitCoverageIndicator: =>
    editorView = atom.workspaceView.getActiveView()
    messages = []
    message =
      line: false
      column: false
      msg: 'Running coverage analysis'
    messages.push message
    @emit @name + '-messages', editorView, messages

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
    #@emitCoverageIndicator()

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
      if exitcode isnt 0
        messages = [{line:false, col: false, msg:stdout + stderr, type:'error', source: @name}]
        @emit @name + '-messages', editorView, messages
      else
        @parser.setDataFile(tempFile)
        for area in areas
          area.processCoverageFile()
        @emit 'reset'
      @covering = false
      @emit @name + '-complete', editorView, saving
      callback(null, messages)
    @dispatch.executor.exec(cmd, cwd, env, done, args)

  resetCoverage: =>
    for area in areas
      area.removeMarkers()

  isValidEditorView: (editorView) =>
    @dispatch.isValidEditorView(editorView)

  rangesForFile: (path) =>
    @parser.rangesForFile(path)
