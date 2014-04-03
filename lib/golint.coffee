spawn = require('child_process').spawn
{Subscriber, Emitter} = require 'emissary'

module.exports =
class Golint
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (dispatch) ->
    atom.workspaceView.command "golang:golint", => @checkCurrentBuffer()
    @dispatch = dispatch

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
    unless @dispatch.isValidEditorView(editorView)
      @emit 'lint-complete', editorView, saving
      return
    if saving and not atom.config.get('go-plus.lintOnSave')
      @emit 'lint-complete', editorView, saving
      return
    buffer = editorView?.getEditor()?.getBuffer()
    unless buffer?
      @emit 'lint-complete', editorView, saving
      return
    gopath = @dispatch.buildGoPath()
    args = [buffer.getPath()]
    lintCmd = atom.config.get('go-plus.golintPath')
    lintCmd = lintCmd.replace(/^\$GOPATH\//i, gopath + '/') if gopath? and gopath isnt ''
    lint = spawn(lintCmd, args)
    lint.on 'error', (error) => console.log 'lint: error launching lint command [' + lintCmd + '] – ' + error  + ' – current PATH: [' + process.env.PATH + ']' if error?
    lint.stderr.on 'data', (data) => console.log 'lint: ' + data if data?
    lint.stdout.on 'data', (data) => @mapErrors(editorView, data)
    lint.on 'close', (code) =>
      console.log 'lint: [' + lintCmd + '] exited with code [' + code + ']' if code isnt 0
      @emit 'lint-complete', editorView, saving

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
    @emit "lint-errors", editorView, errors
