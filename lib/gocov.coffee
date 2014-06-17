{spawn} = require 'child_process'
temp = require 'temp'
path = require 'path'
fs = require 'fs-plus'
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
    @name = 'gocov'
    @covering = false
    @parser = new GocovParser(dispatch)

    atom.workspaceView.command 'golang:gocov', => @toggleCoverage()
    atom.workspaceView.eachEditorView (editorView) =>
      area = new GocovAreaView(editorView, this)
      area.attach()
      areas.push area

  destroy: ->
    @unsubscribe()
    @removeCoverageFile()
    for area in areas
      area.destroy()

  coverageEnabled: ->
    @covering

  toggleCoverage: =>
    @covering = !@covering
    if @covering
      @emitCoverageIndicator()
      @dispatch.emit 'dispatch-complete'
      @runCoverage()
    else
      @resetCoverage()

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

  runCoverage: (editorView, saving, callback) =>
    unless @dispatch.isValidEditorView(editorView)
      @emit @name + '-complete', editorView, saving
      callback(null)
      return
    if saving and not atom.config.get('go-plus.formatOnSave')
      @emit @name + '-complete', editorView, saving
      callback(null)
      return
    buffer = editorView?.getEditor()?.getBuffer()
    unless buffer?
      @emit @name + '-complete', editorView, saving
      callback(null)
      return

    unless @coverageEnabled()
      @emit @name + '-complete', editorView, saving
      callback(null)
      return

    @emitCoverageIndicator()

    tempFile = @createCoverageFile()
    gopath = @dispatch.buildGoPath()
    env = @dispatch.env()
    env['GOPATH'] = gopath
    re = new RegExp(buffer.getBaseName() + '$')
    cwd = buffer.getPath().replace(re, '')
    cmd = @dispatch.goexecutable.current().executable
    args = ["test", "-coverprofile=#{tempFile}"]
    done = (exitcode, stdout, stderr, messages) =>
      console.log @name + ' - stdout: ' + stdout if stdout? and stdout.trim() isnt ''
      console.log @name + ' - stderr: ' + stderr if stderr? and stderr.trim() isnt ''
      if exitcode isnt 0
        messages = [{line:false, col: false, msg:stdout + stderr, type:'error', source: @name}]
        @emit @name + '-messages', editorView, messages
      else
        @parser.setDataFile(tempFile)
        for area in areas
          area.processCoverageFile()
        @emit 'reset'
      @emit @name + '-complete', editorView, saving
      callback(null, messages)
    @dispatch.executor.exec(cmd, cwd, env, done, args)
    console.log cmd, " test -coverprofile=#{tempFile}"

  resetCoverage: =>
    for area in areas
      area.removeMarkers()

  isValidEditorView: (editorView) =>
    @dispatch.isValidEditorView(editorView)

  rangesForFile: (path) =>
    @parser.rangesForFile(path)
