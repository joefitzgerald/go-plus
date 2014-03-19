spawn = require('child_process').spawn
{Subscriber, Emitter} = require 'emissary'

module.exports =
class Gofmt
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: ->
    atom.workspaceView.command "golang:gofmt", => @gofmt.formatCurrentBuffer()

  destroy: ->
    @unsubscribe

  reset: ->
    @emit "reset"

  formatCurrentBuffer: ->
    editor = atom.workspace.getActiveEditor()
    @reset
    @formatBuffer(editor.getBuffer(), editor, false)

  formatBuffer: (buffer, editor, saving) ->
    grammar = editor.getGrammar()
    return if saving and not atom.config.get('go-plus.formatOnSave')
    return if grammar.scopeName isnt 'source.go'
    args = ["-w", buffer.getPath()]
    fmtCmd = atom.config.get('go-plus.gofmtPath')
    fmt = spawn(fmtCmd, args)
    fmt.on 'error', (error) -> console.log 'go-plus: error launching format command [' + fmtCmd + '] – ' + error  + ' – current PATH: [' + process.env.PATH + ']' if error?
    fmt.stderr.on 'data', (data) => @mapErrors(buffer, editor, data)
    fmt.stdout.on 'data', (data) -> console.log 'go-plus: format – ' + data if data?
    fmt.on 'close', (code) -> console.log fmtCmd + 'go-plus: format – exited with code [' + code + ']' if code isnt 0

  mapErrors: (buffer, editor, data) ->
    pattern = /^(.*?):(\d*?):(\d*?):\s(.*)$/img
    errors = []
    extract = (matchLine) ->
      return unless matchLine?
      error = [matchLine[2], matchLine[3], matchLine[4]]
      errors.push error
    loop
      match = pattern.exec(data)
      extract(match)
      break unless match?
    @emit "gofmt-errors", errors
