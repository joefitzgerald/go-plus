spawn = require('child_process').spawn
{Subscriber, Emitter} = require 'emissary'

module.exports =
class Govet
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: ->
    atom.workspaceView.command "golang:govet", => @govet.checkCurrentBuffer()

  destroy: ->
    @unsubscribe

  reset: ->
    @emit "reset"

  checkCurrentBuffer: ->
    # TODO: Figure Out How To Get Active EditorView
    editor = atom.workspace.getActiveEditor()
    @reset
    @checkBuffer(editor, false)

  checkBuffer: (editorView, saving) ->
    editor = editorView.getEditor()
    grammar = editor.getGrammar()
    return if saving and not atom.config.get('go-plus.vetOnSave')
    return if grammar.scopeName isnt 'source.go'
    args = ["vet", editor.getBuffer().getPath()]
    vetCmd = atom.config.get('go-plus.goPath')
    vet = spawn(vetCmd, args)
    vet.on 'error', (error) -> console.log 'go-plus: error launching vet command [' + vetCmd + '] – ' + error  + ' – current PATH: [' + process.env.PATH + ']' if error?
    vet.stderr.on 'data', (data) => @mapErrors(editorView, data)
    vet.stdout.on 'data', (data) -> console.log 'go-plus: vet – ' + data if data?
    vet.on 'close', (code) -> console.log vetCmd + 'go-plus: vet – exited with code [' + code + ']' if code isnt 0

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
    @emit "govet-errors", editorView, errors
