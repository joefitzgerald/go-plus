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

  runCoverage: =>
    return unless @coverageEnabled()

    @emitCoverageIndicator()

    editorView = atom.workspaceView.getActiveView()
    buffer = editorView?.getEditor()?.getBuffer()
    tempFile = @createCoverageFile()
    gopath = @dispatch.buildGoPath()
    env = @dispatch.env()
    env['GOPATH'] = gopath
    re = new RegExp(buffer.getBaseName() + '$')
    cwd = buffer.getPath().replace(re, '')
    cmd = atom.config.get('go-plus.goExecutablePath')
    cmd = @dispatch.replaceTokensInPath(cmd, true)
    console.log cmd, "test -coverprofile=#{tempFile}"
    proc = spawn(cmd, ["test", "-coverprofile=#{tempFile}"], {cwd: cwd, env: env})
    output = ''
    proc.on 'error', (error) =>
      return unless error?
      console.log @name + ': error launching command [go] – ' + error  + ' – current PATH: [' + env.PATH + ']'
    proc.stderr.on 'data', (data) => console.log 'go test: ' + data if data?
    proc.stdout.on 'data', (data) =>
      output += data if data?
      console.log 'go test: ' + data if data?
    proc.on 'close', (code) =>
      if code isnt 0
        console.log 'gocov: [go test] exited with code [' + code + ']'
        messages = [{line:false, col: false, msg:output, type:'error'}]
        @emit @name + '-messages', editorView, messages
      else
        @parser.setDataFile(tempFile)
        for area in areas
          area.processCoverageFile()
        @emit 'reset'

  resetCoverage: =>
    for area in areas
      area.removeMarkers()

  isValidEditorView: (editorView) =>
    @dispatch.isValidEditorView(editorView)

  rangesForFile: (path) =>
    @parser.rangesForFile(path)
