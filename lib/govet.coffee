spawn = require('child_process').spawn
{Subscriber, Emitter} = require 'emissary'

module.exports =
class Govet
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (dispatch) ->
    atom.workspaceView.command 'golang:govet', => @checkCurrentBuffer()
    @dispatch = dispatch
    @name = 'vet'

  destroy: ->
    @unsubscribe

  reset: (editorView) ->
    @emit 'reset', editorView

  checkCurrentBuffer: ->
    editorView = atom.workspaceView.getActiveView()
    return unless editorView?
    @reset editorView
    @checkBuffer(editorView, false)

  checkBuffer: (editorView, saving) ->
    unless @dispatch.isValidEditorView(editorView)
      @emit @name + '-complete', editorView, saving
      return
    if saving and not atom.config.get('go-plus.vetOnSave')
      @emit @name + '-complete', editorView, saving
      return
    buffer = editorView?.getEditor()?.getBuffer()
    unless buffer?
      @emit @name + '-complete', editorView, saving
      return
    args = [@name, buffer.getPath()]
    cmd = atom.config.get('go-plus.goExecutablePath')
    cmd = @dispatch.replaceTokensInPath(cmd, true)
    errored = false
    proc = spawn(cmd, args)
    proc.on 'error', (error) =>
      return unless error?
      errored = true
      console.log @name + ': error launching ' + @name + ' command [' + cmd + '] – ' + error  + ' – current PATH: [' + process.env.PATH + ']'
      errors = []
      error = line: false, column: false, type: 'error', msg: 'Go Executable Not Found @ ' + cmd
      errors.push error
      @emit @name + '-errors', editorView, errors
      @emit @name + '-complete', editorView, saving
    proc.stderr.on 'data', (data) => @mapErrors(editorView, data)
    proc.stdout.on 'data', (data) => console.log @name + ': ' + data if data?
    proc.on 'close', (code) =>
      console.log @name + ': [' + cmd + '] exited with code [' + code + ']' if code isnt 0
      @emit @name + '-complete', editorView, saving unless errored

  mapErrors: (editorView, data) ->
    pattern = /^(.*?):(\d*?):((\d*?):)?\s(.*)$/img
    errors = []
    extract = (matchLine) ->
      return unless matchLine?
      error = switch
        when matchLine[4]?
          line: matchLine[2]
          column: matchLine[4]
          msg: matchLine[5]
          type: 'warning'
        else
          line: matchLine[2]
          column: false
          msg: matchLine[5]
          type: 'warning'
      errors.push error
    loop
      match = pattern.exec(data)
      extract(match)
      break unless match?
    @emit @name + '-errors', editorView, errors
