Gofmt = require './gofmt'
{Subscriber, Emitter} = require 'emissary'
Govet = require './govet'
_ = require 'underscore-plus'
$ = require('atom').$

module.exports =
class Dispatch
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: ->
    @errorCollection = []
    @gofmt = new Gofmt()
    @govet = new Govet()
    @gofmt.on 'fmt-complete', (editorView, saving) =>
      @emit 'fmt-complete', editorView, saving
      @govet.checkBuffer(editorView, saving)
    @govet.on 'vet-complete', (editorView, saving) =>
      @emit 'vet-complete', editorView, saving
      @emit 'dispatch-complete', editorView
    @gofmt.on 'fmt-errors', (editorView, errors) =>
      @collectErrors(errors)
    @govet.on 'vet-errors', (editorView, errors) =>
      @collectErrors(errors)
    @on 'dispatch-complete', (editorView) =>
      @updatePane(editorView, @errorCollection)
      @updateGutter(editorView, @errorCollection)
    atom.workspaceView.eachEditorView (editorView) => @handleEvents(editorView)
    atom.workspaceView.on 'pane-container:active-pane-item-changed', => @resetPane()

  collectErrors: (errors) ->
    @errorCollection = _.union(@errorCollection, errors)
    @errorCollection = _.uniq @errorCollection, (element, index, list) ->
      return element.line + ":" + element.column + ":" + element.msg
    @emit 'errors-collected', _.size(@errorCollection)

  destroy: ->
    @unsubscribe
    @govet.destroy()
    @gofmt.destroy()

  handleEvents: (editorView) ->
    editor = editorView.getEditor()
    buffer = editor.getBuffer()
    buffer.on 'saved', => @handleBufferSave(editorView, true)
    editor.on 'destroyed', => buffer.off 'saved'

  handleBufferSave: (editorView, saving) ->
    editor = editorView.getEditor()
    grammar = editor.getGrammar()
    return if grammar.scopeName isnt 'source.go'
    @resetState(editorView)
    @gofmt.formatBuffer(editorView, saving)

  resetState: (editorView) ->
    @errorCollection = []
    @resetGutter(editorView)
    @resetPane()

  resetGutter: (editorView) ->
    gutter = editorView.gutter
    gutter.removeClassFromAllLines('go-plus-error')

  updateGutter: (editorView, errors) ->
    @resetGutter(editorView)
    return unless errors?
    return if errors.length <= 0
    gutter = editorView.gutter
    gutter.addClassToLine error.line - 1, 'go-plus-error' for error in errors

  resetPane: ->
    $('#go-plus-status-pane').remove()

  updatePane: (editorView, errors) ->
    @resetPane()
    return unless errors?
    return if errors.length <= 0
    return unless atom.config.get('go-plus.showErrorPanel')
    errorPane = $('#go-plus-status-pane')
    unless errorPane.length > 0
      newErrorPane = $('<div id="go-plus-status-pane" class="go-plus-pane" style="height:">')
      # TODO: When Atom API Supports It, Add This To The EditorView So We Can Keep
      # Errors Scoped To The Relevent Editor Rather Than The Entire Workspace
      atom.workspaceView.prependToBottom(newErrorPane)
      errorPane = $('#go-plus-status-pane')
    sortedErrors = _.sortBy @errorCollection, (element, index, list) ->
      return parseInt(element.line, 10)
    for error in sortedErrors
      msg = switch
        when error.column isnt false then 'Line: ' + error.line + ' Char: ' + error.column + ' – ' + error.msg
        else 'Line: ' + error.line + ' – ' + error.msg
      errorPane.append(msg)
      errorPane.append('<br/>')

  # updateStatus: (errors, row) ->
  #   msg = ''
  #   return if not errors? or errors == false
  #   return if errors.length <= 0
  #   lineErrors = _.filter(errors, (error) -> error[0] is row + 1)
  #   return if not lineErrors?
  #   return if lineErrors.length <= 0
  #   msg = 'Error: ' + lineErrors[0][0] + ':' + lineErrors[0][1] + ' ' + lineErrors[0][2]
  #   atom.workspaceView.statusBar.appendLeft('<span id="go-plus-status" class="inline-block">' + msg + '</span>')
