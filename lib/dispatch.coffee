{Subscriber, Emitter} = require 'emissary'
Gofmt = require './gofmt'
Govet = require './govet'
Golint = require './golint'
Gobuild = require './gobuild'
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
    @golint = new Golint(this)
    @gobuild = new Gobuild(this)

    # Pipeline For Processing Buffer
    @gofmt.on 'fmt-complete', (editorView, saving) =>
      @emit 'fmt-complete', editorView, saving
      @govet.checkBuffer(editorView, saving) if saving
      @emit 'dispatch-complete', editorView if not saving
    @govet.on 'vet-complete', (editorView, saving) =>
      @emit 'vet-complete', editorView, saving
      @golint.checkBuffer(editorView, saving) if saving
      @emit 'dispatch-complete', editorView if not saving
    @golint.on 'lint-complete', (editorView, saving) =>
      @emit 'lint-complete', editorView, saving
      @gobuild.checkBuffer(editorView, saving) if saving
      @emit 'dispatch-complete', editorView if not saving
    @gobuild.on 'syntaxcheck-complete', (editorView, saving) =>
      @emit 'syntaxcheck-complete', editorView, saving
      @emit 'dispatch-complete', editorView

    # Collect Errors
    @gofmt.on 'fmt-errors', (editorView, errors) =>
      @collectErrors(errors)
    @govet.on 'vet-errors', (editorView, errors) =>
      @collectErrors(errors)
    @golint.on 'lint-errors', (editorView, errors) =>
      @collectErrors(errors)
    @gobuild.on 'syntaxcheck-errors', (editorView, errors) =>
      @collectErrors(errors)

    # Reset State If Requested
    @gofmt.on 'reset', (editorView) =>
      @resetState(editorView)
    @golint.on 'reset', (editorView) =>
      @resetState(editorView)
    @govet.on 'reset', (editorView) =>
      @resetState(editorView)
    @gobuild.on 'reset', (editorView) =>
      @resetState(editorView)

    # Update Pane And Gutter With Errors
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
    @gobuild.destroy()
    @golint.destroy()
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
    gutter = editorView?.gutter
    return unless gutter?
    gutter.removeClassFromAllLines('go-plus-error')

  updateGutter: (editorView, errors) ->
    @resetGutter(editorView)
    return unless errors?
    return if errors.length <= 0
    gutter = editorView?.gutter
    return unless gutter?
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
      prefix = switch
        when error.line isnt false and error.column isnt false then 'Line: ' + error.line + ' Char: ' + error.column
        when error.line isnt false and error.column is false then 'Line: ' + error.line
        else ''
      msg = if prefix is '' then error.msg else prefix + ' – ' + error.msg
      errorPane.append(msg)
      errorPane.append('<br/>')

  buildGoPath: ->
    gopath = ''
    gopathEnv = process.env.GOPATH
    gopathConfig = atom.config.get('go-plus.goPath')
    environmentOverridesConfig = atom.config.get('go-plus.environmentOverridesConfiguration')
    environmentOverridesConfig ?= true
    gopath = gopathEnv if gopathEnv? and gopathEnv isnt ''
    gopath = gopathConfig if not environmentOverridesConfig and gopathConfig? and gopathConfig isnt ''
    gopath = gopathConfig if gopath is ''
    return gopath

  # updateStatus: (errors, row) ->
  #   msg = ''
  #   return if not errors? or errors == false
  #   return if errors.length <= 0
  #   lineErrors = _.filter(errors, (error) -> error[0] is row + 1)
  #   return if not lineErrors?
  #   return if lineErrors.length <= 0
  #   msg = 'Error: ' + lineErrors[0][0] + ':' + lineErrors[0][1] + ' ' + lineErrors[0][2]
  #   atom.workspaceView.statusBar.appendLeft('<span id="go-plus-status" class="inline-block">' + msg + '</span>')
