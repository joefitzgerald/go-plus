Gofmt = require './gofmt'
{Subscriber} = require 'emissary'
Govet = require './govet'
_ = require 'underscore-plus'
$ = require('atom').$

module.exports =
class Dispatch
  Subscriber.includeInto(this)

  constructor: ->
    @gofmt = new Gofmt()
    @govet = new Govet()
    @gofmt.on 'gofmt-errors', (errors) =>
      @updatePane(errors)
      @updateGutter(errors)
    @govet.on 'govet-errors', (errors) =>
      @updatePane(errors)
      @updateGutter(errors)
    atom.workspace.eachEditor (editor) => @handleBufferEvents(editor)

  destroy: ->
    @unsubscribe
    @govet.destroy()
    @gofmt.destroy()

  handleBufferEvents: (editor) ->
    buffer = editor.getBuffer()
    buffer.on 'saved', => @handleBufferSave(buffer, editor, true)
    editor.on 'destroyed', => buffer.off 'saved'

  handleBufferSave: (buffer, editor, saving) ->
    grammar = editor.getGrammar()
    return if saving and not atom.config.get('go-plus.formatOnSave')
    return if grammar.scopeName isnt 'source.go'
    @resetState(editor)
    @gofmt.formatBuffer(buffer, editor, true)
    @govet.checkBuffer(buffer, editor, true)

  resetState: (editor) ->
    @resetGutter([])
    @resetPane([])
    # @updateStatus(false)

  resetGutter: ->
    atom.workspaceView.eachEditorView (editorView) =>
      return unless editorView.active
      gutter = editorView.gutter
      gutter.removeClassFromAllLines('go-plus-error')

  updateGutter: (errors) ->
    atom.workspaceView.eachEditorView (editorView) =>
      return unless editorView.active
      gutter = editorView.gutter
      gutter.addClassToLine error[0] - 1, 'go-plus-error' for error in errors

  resetPane: ->
    $('#go-plus-status-pane').remove()

  updatePane: (errors) ->
    return unless errors?
    return if errors.length <= 0
    return unless atom.config.get('go-plus.showErrorPanel')
    html = $('<div id="go-plus-status-pane" class="go-plus-pane" style="height:">');
    for error in errors
      msg = if error[1] isnt false then 'Line: ' + error[0] + ' Char: ' + error[1] + ' – ' + error[2] else 'Line: ' + error[0] + ' – ' + error[2]
      html.append(msg)
      html.append('<br/>')
    atom.workspaceView.prependToBottom(html)

  updateStatus: (errors, row) ->
    status = document.getElementById('go-plus-status')
    msg = ''
    status.parentElement.removeChild(status) if status?
    return if not errors? or errors == false
    return if errors.length <= 0
    lineErrors = _.filter(errors, (error) -> error[0] is row + 1)
    return if not lineErrors?
    return if lineErrors.length <= 0
    msg = 'Error: ' + lineErrors[0][0] + ':' + lineErrors[0][1] + ' ' + lineErrors[0][2]
    atom.workspaceView.statusBar.appendLeft('<span id="go-plus-status" class="inline-block">' + msg + '</span>')
