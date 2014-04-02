spawn = require('child_process').spawn
{Subscriber, Emitter} = require 'emissary'

module.exports =
class Gofmt
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: ->
    atom.workspaceView.command "golang:gofmt", => @formatCurrentBuffer()

  destroy: ->
    @unsubscribe

  reset: (editorView) ->
    @emit "reset", editorView

  formatCurrentBuffer: ->
    editorView = atom.workspaceView.getActiveView()
    return unless editorView?
    @reset editorView
    @formatBuffer(editorView, false)

  formatBuffer: (editorView, saving) ->
    editor = editorView.getEditor()
    grammar = editor.getGrammar()
    return if grammar.scopeName isnt 'source.go'
    if saving and not atom.config.get('go-plus.formatOnSave')
      @emit 'fmt-complete', editorView, saving
      return
    buffer = editor.getBuffer()
    unless buffer?
      @emit 'syntaxcheck-complete', editorView, saving
      return
    args = ["-w", buffer.getPath()]
    fmtCmd = atom.config.get('go-plus.gofmtPath')
    fmt = spawn(fmtCmd, args)
    fmt.on 'error', (error) => console.log 'fmt: error launching format command [' + fmtCmd + '] – ' + error  + ' – current PATH: [' + process.env.PATH + ']' if error?
    fmt.stderr.on 'data', (data) => @mapErrors(editorView, data)
    fmt.stdout.on 'data', (data) => console.log 'fmt: ' + data if data?
    fmt.on 'close', (code) =>
      console.log 'fmt: [' + fmtCmd + '] exited with code [' + code + ']' if code isnt 0
      @emit 'fmt-complete', editorView, saving

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
        else
          line: matchLine[2]
          column: false
          msg: matchLine[5]
      errors.push error
    loop
      match = pattern.exec(data)
      extract(match)
      break unless match?
    @emit "fmt-errors", editorView, errors
