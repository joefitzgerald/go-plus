{spawn} = require('child_process')
{Subscriber, Emitter} = require 'emissary'

module.exports =
class OracleCommand
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  oracleCommand: (cmd, format, importPath) ->
    path = @getPath()
    [startOffset, endOffset] = @getPosition()

    gopath = @dispatch.buildGoPath()
    env = {"GOPATH": gopath}
    oracleCmd = atom.config.get('go-plus.oraclePath')
    oracleCmd = @dispatch.replaceGoPathToken(oracleCmd)

    args = ["-pos=#{path}:##{startOffset}", "-format=#{format}", cmd]
    args.push(importPath) if importPath?

    console.log "#{oracleCmd} -pos=#{path}:##{startOffset} -format=plain #{cmd} #{importPath}"

    return spawn(oracleCmd, args, {"env": env})

  constructor: (dispatch) ->
    @dispatch = dispatch

    @on 'what-complete', (whatData) =>
      cmd = @oracleCommand(@nextCommand, "plain", whatData.what.importpath)
      parsedData = ''
      cmd.stdout.on 'data', (data) =>
        parsedData = data

      cmd.on 'close', (code) =>
        @emit "oracle-complete", @nextCommand, parsedData

  what: ->
    what = @oracleCommand("what", "json")
    parsedData = ''
    what.stdout.on 'data', (data) =>
      parsedData = JSON.parse(data)

    what.on 'close', (code) =>
      @emit 'what-complete', parsedData

  command: (cmd) ->
    @nextCommand = cmd
    @what()

  getPath: ->
    return atom.workspace.getActiveEditor()?.getPath()

  getPosition: ->
    editorView = atom.workspaceView.getActiveView()
    buffer = editorView?.getEditor()?.getBuffer()
    cursor = editorView?.getEditor()?.getCursor()

    startPosition = cursor.getBeginningOfCurrentWordBufferPosition({"includeNonWordCharacters":false})
    endPosition = cursor.getEndOfCurrentWordBufferPosition({"includeNonWordCharacters":false})

    startOffset = buffer.characterIndexForPosition(startPosition)
    endOffset = buffer.characterIndexForPosition(endPosition)

    return [startOffset, endOffset]
