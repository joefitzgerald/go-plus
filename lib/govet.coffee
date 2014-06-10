{spawn} = require 'child_process'
{Subscriber, Emitter} = require 'emissary'
_ = require 'underscore-plus'

module.exports =
class Govet
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (dispatch) ->
    atom.workspaceView.command 'golang:govet', => @checkCurrentBuffer()
    @dispatch = dispatch
    @name = 'vet'

  destroy: ->
    @unsubscribe()

  reset: (editorView) ->
    @emit 'reset', editorView

  checkCurrentBuffer: ->
    editorView = atom.workspaceView.getActiveView()
    return unless editorView?
    @reset editorView
    @checkBuffer(editorView, false)

  checkBuffer: (editorView, saving, callback) ->
    unless @dispatch.isValidEditorView(editorView)
      @emit @name + '-complete', editorView, saving
      callback(null)
      return
    if saving and not atom.config.get('go-plus.vetOnSave')
      @emit @name + '-complete', editorView, saving
      callback(null)
      return
    buffer = editorView?.getEditor()?.getBuffer()
    unless buffer?
      @emit @name + '-complete', editorView, saving
      callback(null)
      return
    args = @dispatch.splicersplitter.splitAndSquashToArray(' ', atom.config.get('go-plus.vetArgs'))
    args = args.concat([buffer.getPath()])
    cmd = @dispatch.goexecutable.current().vet()
    done = (exitcode, stdout, stderr) =>
      console.log @name + ' - stdout: ' + stdout if stdout? and stdout isnt ''
      console.log @name + ' - stderr: ' + stderr if stderr? and stderr isnt ''
      messages = []
      messages = @mapMessages(editorView, stderr) if stderr? and stderr isnt ''
      console.log @name + ': [' + cmd + '] exited with code [' + exitcode + ']' if exitcode isnt 0

      # TODO:
      # console.log @name + ': error launching command [' + cmd + '] – ' + error  + ' – current PATH: [' + @dispatch.env().PATH + ']'
      # messages = []
      # message = line: false, column: false, type: 'error', msg: 'Gofmt Executable Not Found @ ' + cmd + ' ($GOPATH: ' + go.buildgopath() + ')'
      # messages.push message
      # @emit @name + '-messages', editorView, messages
      # @emit @name + '-complete', editorView, saving
      @emit @name + '-complete', editorView, saving
      callback(null, messages)
    @dispatch.executor.exec(cmd, null, null, done, args)

  mapMessages: (editorView, data) ->
    pattern = /^(.*?):(\d*?):((\d*?):)?\s(.*)$/img
    messages = []
    extract = (matchLine) ->
      return unless matchLine?
      message = switch
        when matchLine[4]?
          line: matchLine[2]
          column: matchLine[4]
          msg: matchLine[5]
          type: 'warning'
          source: 'vet'
        else
          line: matchLine[2]
          column: false
          msg: matchLine[5]
          type: 'warning'
          source: 'vet'
      messages.push message
    loop
      match = pattern.exec(data)
      extract(match)
      break unless match?
    @emit @name + '-messages', editorView, messages
    return messages
