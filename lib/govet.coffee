spawn = require('child_process').spawn
{Subscriber, Emitter} = require 'emissary'

module.exports =
class Govet
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: ->
    atom.workspaceView.command "golang:govet", => @checkCurrentBuffer()

  destroy: ->
    @unsubscribe

  reset: (editorView) ->
    @emit "reset", editorView

  checkCurrentBuffer: ->
    editorView = atom.workspaceView.getActiveView()
    return unless editorView?
    @reset editorView
    @checkBuffer(editorView, false)

  checkBuffer: (editorView, saving) ->
    editor = editorView.getEditor()
    grammar = editor.getGrammar()
    return if grammar.scopeName isnt 'source.go'
    if saving and not atom.config.get('go-plus.vetOnSave')
      @emit 'vet-complete', editorView, saving
      return
    buffer = editor.getBuffer()
    unless buffer?
      @emit 'syntaxcheck-complete', editorView, saving
      return
    args = ["vet", buffer.getPath()]
    vetCmd = atom.config.get('go-plus.goExecutablePath')
    vet = spawn(vetCmd, args)
    vet.on 'error', (error) => console.log 'vet: error launching vet command [' + vetCmd + '] – ' + error  + ' – current PATH: [' + process.env.PATH + ']' if error?
    vet.stderr.on 'data', (data) => @mapErrors(editorView, data)
    vet.stdout.on 'data', (data) => console.log 'vet: ' + data if data?
    vet.on 'close', (code) =>
      console.log 'vet: [' + vetCmd + '] exited with code [' + code + ']' if code isnt 0
      @emit 'vet-complete', editorView, saving

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
    @emit "vet-errors", editorView, errors
