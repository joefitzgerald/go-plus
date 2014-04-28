spawn = require('child_process').spawn
temp = require('temp')
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
    tempDir = temp.mkdirSync()
    tempFile = tempDir + "/coverage.out"
    gopath = @dispatch.buildGoPath()
    editorView = atom.workspaceView.getActiveView()
    buffer = editorView?.getEditor()?.getBuffer()
    env = process.env
    env['GOPATH'] = gopath
    re = new RegExp(buffer.getBaseName() + '$')
    cwd = buffer.getPath().replace(re, '')
    cmd = atom.config.get('go-plus.goExecutablePath')
    cmd = @dispatch.replaceTokensInPath(cmd, true)
    console.log cmd, "test -coverprofile=#{tempFile}"
    proc = spawn(cmd, ["test", "-coverprofile=#{tempFile}"], {cwd: cwd, env: env})
    proc.on 'error', (error) =>
      return unless error?
      console.log @name + ': error launching command [go] – ' + error  + ' – current PATH: [' + process.env.PATH + ']'
    proc.stderr.on 'data', (data) => console.log 'go test: ' + data if data?
    proc.stdout.on 'data', (data) => console.log 'go test: ' + data if data?
    proc.on 'close', (code) =>
      @parser.setDataFile(tempFile)
      console.log 'gocov: [go test] exited with code [' + code + ']' if code isnt 0
      for area in areas
        area.processCoverageFile()

  resetCoverage: =>
    for area in areas
      area.removeMarkers()

  isValidEditorView: (editorView) =>
    @dispatch.isValidEditorView(editorView)

  rangesForFile: (path) =>
    @parser.rangesForFile(path)
