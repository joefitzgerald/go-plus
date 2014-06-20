{spawn} = require 'child_process'
{Subscriber, Emitter} = require 'emissary'
_ = require 'underscore-plus'

module.exports =
class Gofmt
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (dispatch) ->
    atom.workspaceView.command 'golang:gofmt', => @formatCurrentBuffer()
    @dispatch = dispatch
    @name = 'fmt'

  destroy: ->
    @unsubscribe()

  reset: (editorView) ->
    @emit 'reset', editorView

  formatCurrentBuffer: ->
    editorView = atom.workspaceView.getActiveView()
    return unless editorView?
    @reset editorView
    @formatBuffer(editorView, false)

  formatBuffer: (editorView, saving, callback = ->) ->
    unless @dispatch.isValidEditorView(editorView)
      @emit @name + '-complete', editorView, saving
      callback(null)
      return
    if saving and not atom.config.get('go-plus.formatOnSave')
      @emit @name + '-complete', editorView, saving
      callback(null)
      return
    buffer = editorView?.getEditor()?.getBuffer()
    unless buffer?
      @emit @name + '-complete', editorView, saving
      callback(null)
      return
    args = ['-w']
    configArgs = @dispatch.splicersplitter.splitAndSquashToArray(' ', atom.config.get('go-plus.gofmtArgs'))
    args = args.concat(configArgs) if configArgs? and _.size(configArgs) > 0
    args = args.concat([buffer.getPath()])
    go = @dispatch.goexecutable.current()
    cmd = go.gofmt()
    done = (exitcode, stdout, stderr, messages) =>
      console.log @name + ' - stdout: ' + stdout if stdout? and stdout.trim() isnt ''
      messages = @mapMessages(editorView, stderr) if stderr? and stderr.trim() isnt ''
      @emit @name + '-complete', editorView, saving
      callback(null, messages)
    @dispatch.executor.exec(cmd, false, @dispatch?.env(), done, args)

  mapMessages: (editorView, data) ->
    pattern = /^(.*?):(\d*?):((\d*?):)?\s(.*)$/img
    messages = []
    return messages unless data? and data isnt ''
    extract = (matchLine) ->
      return unless matchLine?
      message = switch
        when matchLine[4]?
          line: matchLine[2]
          column: matchLine[4]
          msg: matchLine[5]
          type: 'error'
          source: 'fmt'
        else
          line: matchLine[2]
          column: false
          msg: matchLine[5]
          type: 'error'
          source: 'fmt'
      messages.push message
    loop
      match = pattern.exec(data)
      extract(match)
      break unless match?
    return messages
