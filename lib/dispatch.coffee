{Subscriber, Emitter} = require 'emissary'
Gofmt = require './gofmt'
Govet = require './govet'
Golint = require './golint'
Gopath = require './gopath'
Gobuild = require './gobuild'
Gocov = require './gocov'
Executor = require './executor'
GoExecutable = require './goexecutable'
SplicerSplitter = require './util/splicersplitter'
_ = require 'underscore-plus'
{MessagePanelView, LineMessageView, PlainMessageView} = require 'atom-message-panel'
{$} = require 'atom'
path = require 'path'
async = require 'async'

module.exports =
class Dispatch
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: ->
    # Manage Save Pipeline
    @dispatching = false
    @ready = false
    @messages = []

    @processEnv = process.env
    @executor = new Executor()
    @splicersplitter = new SplicerSplitter()
    @goexecutable = new GoExecutable(@processEnv)
    @goexecutable.on 'detect-complete', =>
      @gettools if atom.config.get('go-plus.getMissingTools')
      #unless atom.config.get('go-plus.getMissingTools')
      @ready = true
      @emit 'ready'
    @goexecutable.detect()

    @gofmt = new Gofmt(this)
    @govet = new Govet(this)
    @golint = new Golint(this)
    @gopath = new Gopath(this)
    @gobuild = new Gobuild(this)
    @gocov = new Gocov(this)
    @messagepanel = new MessagePanelView title: '<span class="icon-diff-added"></span> go-plus', rawTitle: true

    # Reset State If Requested
    @gofmt.on 'reset', (editorView) =>
      @resetState(editorView)
    @golint.on 'reset', (editorView) =>
      @resetState(editorView)
    @govet.on 'reset', (editorView) =>
      @resetState(editorView)
    @gopath.on 'reset', (editorView) =>
      @resetState(editorView)
    @gobuild.on 'reset', (editorView) =>
      @resetState(editorView)
    @gocov.on 'reset', (editorView) =>
      @resetState(editorView)

    # Update Pane And Gutter With Messages
    @on 'dispatch-complete', (editorView) =>
      @updatePane(editorView, @messages)
      @updateGutter(editorView, @messages)
      @dispatching = false
      @emit 'display-complete'

    atom.workspaceView.eachEditorView (editorView) => @handleEvents(editorView)
    atom.workspaceView.on 'pane-container:active-pane-item-changed', =>
        @resetPanel()
        @messagepanel.close()

  collectMessages: (messages) ->
    messages = _.flatten(messages) if messages? and _.size(messages) > 0
    messages = _.filter messages, (element, index, list) ->
      return element?
    return unless messages?
    messages = _.filter messages, (message) -> message?
    @messages = _.union(@messages, messages)
    @messages = _.uniq @messages, (element, index, list) ->
      return element?.line + ":" + element?.column + ":" + element?.msg
    @emit 'messages-collected', _.size(@messages)

  destroy: ->
    @unsubscribe()
    @gocov.destroy()
    @gobuild.destroy()
    @golint.destroy()
    @govet.destroy()
    @gopath.destroy()
    @gofmt.destroy()

  handleEvents: (editorView) ->
    editor = editorView.getEditor()
    buffer = editor.getBuffer()
    buffer.on 'changed', => @handleBufferChanged(editorView)
    buffer.on 'saved', =>
      return unless not @dispatching
      @dispatching = true
      @handleBufferSave(editorView, true)
    editor.on 'destroyed', => buffer.off 'saved'

  triggerPipeline: (editorView, saving) ->
    async.series([
      (callback) =>
        @gofmt.formatBuffer(editorView, saving, callback)
    ], (err, modifymessages) =>
      @collectMessages(modifymessages)
      async.parallel([
        (callback) =>
          @govet.checkBuffer(editorView, saving, callback)
        (callback) =>
          @golint.checkBuffer(editorView, saving, callback)
        (callback) =>
          @gopath.check(editorView, saving, callback)
        (callback) =>
          @gobuild.checkBuffer(editorView, saving, callback)
      ], (err, checkmessages) =>
        @collectMessages(checkmessages)
        @emit 'dispatch-complete', editorView
      )
    )

    async.series([
      (callback) =>
        @gocov.runCoverage(editorView, saving, callback)
    ], (err, modifymessages) =>
      @emit 'coverage-complete'
    )

  handleBufferSave: (editorView, saving) ->
    return unless @ready? and @ready
    editor = editorView.getEditor()
    grammar = editor.getGrammar()
    return if grammar.scopeName isnt 'source.go'
    @resetState(editorView)
    @triggerPipeline(editorView, saving)

  handleBufferChanged: (editorView) ->
    @gocov.resetCoverage()

  resetState: (editorView) ->
    @messages = []
    @resetGutter(editorView)
    @resetPanel()

  resetGutter: (editorView) ->
    gutter = editorView?.gutter
    return unless gutter?
    gutter.removeClassFromAllLines('go-plus-message')

  updateGutter: (editorView, messages) ->
    @resetGutter(editorView)
    return unless messages?
    return if messages.length <= 0
    gutter = editorView?.gutter
    return unless gutter?
    gutter.addClassToLine message.line - 1, 'go-plus-message' for message in messages

  resetPanel: ->
    @messagepanel.close()
    @messagepanel.clear()

  updatePane: (editorView, messages) ->
    @resetPanel
    return unless messages?
    if messages.length <= 0 and atom.config.get('go-plus.showPanelWhenNoIssuesExist')
      @messagepanel.add new PlainMessageView message: 'No Issues', className: 'text-success'
      @messagepanel.attach()
      return
    return unless messages.length > 0
    return unless atom.config.get('go-plus.showPanel')
    sortedMessages = _.sortBy @messages, (element, index, list) ->
      return parseInt(element.line, 10)
    for message in sortedMessages
      className = switch message.type
        when 'error' then 'text-error'
        when 'warning' then 'text-warning'
        else 'text-info'

      if message.line isnt false and message.column isnt false
        # LineMessageView
        @messagepanel.add new LineMessageView line: message.line, character: message.column, message: message.msg, className: className
      else if message.line isnt false and message.column is false
        # LineMessageView
        @messagepanel.add new LineMessageView line: message.line, message: message.msg, className: className
      else
        # PlainMessageView
        @messagepanel.add new PlainMessageView message: message.msg, className: className
    @messagepanel.attach() if atom?.workspaceView?

  isValidEditorView: (editorView) ->
    editorView?.getEditor()?.getGrammar()?.scopeName is 'source.go'

  env: ->
    _.clone(@processEnv)

  gettools: =>
    return unless atom.config.get('go-plus.getMissingTools')
    @goexecutable.on 'tools-complete', =>
      @ready = true
      @emit 'ready'
    @goexecutable.getmissingtools(@goexecutable.current())
