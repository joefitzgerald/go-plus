{spawn} = require 'child_process'
{Subscriber, Emitter} = require 'emissary'
_ = require 'underscore-plus'
path = require 'path'

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
    @dispatch = null

  reset: (editorView) ->
    @emit 'reset', editorView

  checkCurrentBuffer: ->
    editorView = atom?.workspaceView?.getActiveView()
    return unless @dispatch.isValidEditorView(editorView)
    @reset editorView
    done = (err, messages) =>
      @dispatch.resetAndDisplayMessages(editorView, messages)
    @checkBuffer(editorView, false, done)

  checkBuffer: (editorView, saving, callback = ->) ->
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
    cwd = path.dirname(buffer.getPath())
    args = @dispatch.splicersplitter.splitAndSquashToArray(' ', atom.config.get('go-plus.vetArgs'))
    args = _.union(args, [buffer.getPath()])
    cmd = @dispatch.goexecutable.current().vet()
    if cmd is false
      message =
        line: false
        column: false
        msg: 'Vet Tool Missing'
        type: 'error'
        source: @name
      callback(null, [message])
      return
    done = (exitcode, stdout, stderr, messages) =>
      console.log @name + ' - stdout: ' + stdout if stdout? and stdout.trim() isnt ''
      messages = @mapMessages(editorView, stderr, cwd) if stderr? and stderr.trim() isnt ''
      @emit @name + '-complete', editorView, saving
      callback(null, messages)
    @dispatch.executor.exec(cmd, cwd, null, done, args)

  mapMessages: (editorView, data, cwd) ->
    pattern = /^(.*?):(\d*?):((\d*?):)?\s(.*)$/img
    messages = []
    extract = (matchLine) ->
      return unless matchLine?
      file = if matchLine[1]? and matchLine[1] isnt '' then matchLine[1] else null
      message = switch
        when matchLine[4]?
          file: file
          line: matchLine[2]
          column: matchLine[4]
          msg: matchLine[5]
          type: 'warning'
          source: 'vet'
        else
          file: file
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
