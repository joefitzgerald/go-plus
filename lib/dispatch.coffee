{Subscriber, Emitter} = require 'emissary'
Gofmt = require './gofmt'
Govet = require './govet'
Golint = require './golint'
Gopath = require './gopath'
Gobuild = require './gobuild'
Gocover = require './gocover'
Executor = require './executor'
GoExecutable = require './goexecutable'
SplicerSplitter = require './util/splicersplitter'
_ = require 'underscore-plus'
{MessagePanelView, LineMessageView, PlainMessageView} = require 'atom-message-panel'
{$, SettingsView} = require 'atom'
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
    @goexecutable = new GoExecutable(@env())

    @gofmt = new Gofmt(this)
    @govet = new Govet(this)
    @golint = new Golint(this)
    @gopath = new Gopath(this)
    @gobuild = new Gobuild(this)
    @gocover = new Gocover(this)
    @messagepanel = new MessagePanelView title: '<span class="icon-diff-added"></span> go-plus', rawTitle: true

    @detect()

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
    @gocover.on 'reset', (editorView) =>
      @resetState(editorView)

    # Update Pane And Gutter With Messages
    @on 'dispatch-complete', (editorView) =>
      @displayMessages(editorView)

    atom.workspaceView.eachEditorView (editorView) => @handleEvents(editorView)
    atom.workspaceView.on 'pane-container:active-pane-item-changed', => @resetPanel()
    atom.config.observe 'go-plus.getMissingTools', => @gettools(false) if atom.config.get('go-plus.getMissingTools')? and atom.config.get('go-plus.getMissingTools') and @ready? and @ready
    atom.config.observe 'go-plus.formatWithGoImports', => @displayGoInfo(true) if @ready
    atom.config.observe 'go-plus.goPath', => @displayGoInfo(true) if @ready
    atom.config.observe 'go-plus.environmentOverridesConfiguration', => @displayGoInfo(true) if @ready
    atom.config.observe 'go-plus.goInstallation', => @detect() if @ready
    atom.workspaceView.command 'golang:goinfo', => @displayGoInfo(true) if @ready
    atom.workspaceView.command 'golang:getmissingtools', => @gettools(false)
    atom.workspaceView.command 'golang:updatetools', => @gettools(true)

  detect: =>
    @ready = false
    @goexecutable.once 'detect-complete', =>
      @gettools(false) if atom.config.get('go-plus.getMissingTools')? and atom.config.get('go-plus.getMissingTools')
      @displayGoInfo(false)
      @emitReady()
    @goexecutable.detect()

  resetAndDisplayMessages: (editorView, msgs) =>
    return unless @isValidEditorView(editorView)
    @resetState(editorView)
    @collectMessages(msgs)
    @displayMessages(editorView)

  displayMessages: (editorView) =>
    @updatePane(editorView, @messages)
    @updateGutter(editorView, @messages)
    @dispatching = false
    @emit 'display-complete'

  emitReady: =>
    @ready = true
    @emit 'ready'

  displayGoInfo: (force) =>
    editorView = atom.workspaceView.getActiveView()
    unless force
      return unless editorView?.constructor?
      return unless editorView.constructor?.name is 'SettingsView' or @isValidEditorView(editorView)

    @resetPanel()
    go = @goexecutable.current()
    if go? and go.executable? and go.executable.trim() isnt ''
      @messagepanel.add new PlainMessageView message: 'Using Go: ' + go.name + ' (@' + go.executable + ')', className: 'text-success'

      # gopath
      gopath = go.buildgopath()
      if gopath? and gopath.trim() isnt ''
        @messagepanel.add new PlainMessageView message: 'GOPATH: ' + gopath, className: 'text-success'
      else
        @messagepanel.add new PlainMessageView message: 'GOPATH: Not Set', className: 'text-error'

      # cover
      if go.cover()? and go.cover() isnt false
        @messagepanel.add new PlainMessageView message: 'Cover Tool: ' + go.cover(), className: 'text-success'
      else
        @messagepanel.add new PlainMessageView message: 'Cover Tool: Not Found', className: 'text-error'

      # vet
      if go.vet()? and go.vet() isnt false
        @messagepanel.add new PlainMessageView message: 'Vet Tool: ' + go.vet(), className: 'text-success'
      else
        @messagepanel.add new PlainMessageView message: 'Vet Tool: Not Found', className: 'text-error'

      # gofmt / goimports
      if go.format()? and go.format() isnt false
        @messagepanel.add new PlainMessageView message: 'Format Tool: ' + go.format(), className: 'text-success'
      else
        @messagepanel.add new PlainMessageView message: 'Format Tool: Not Found', className: 'text-error'

      # golint
      if go.golint()? and go.golint() isnt false
        @messagepanel.add new PlainMessageView message: 'Lint Tool: ' + go.golint(), className: 'text-success'
      else
        @messagepanel.add new PlainMessageView message: 'Lint Tool: Not Found', className: 'text-error'

      # oracle
      if go.oracle()? and go.oracle() isnt false
        @messagepanel.add new PlainMessageView message: 'Oracle Tool: ' + go.oracle(), className: 'text-success'
      else
        @messagepanel.add new PlainMessageView message: 'Oracle Tool: Not Found', className: 'text-error'
    else
      @messagepanel.add new PlainMessageView message: 'No Go Installations Were Found', className: 'text-error'
    @messagepanel.attach()

  collectMessages: (messages) ->
    messages = _.flatten(messages) if messages? and _.size(messages) > 0
    messages = _.filter messages, (element, index, list) ->
      return element?
    return unless messages?
    messages = _.filter messages, (message) -> message?
    @messages = _.union(@messages, messages)
    @messages = _.uniq @messages, (element, index, list) ->
      return element?.line + ':' + element?.column + ':' + element?.msg
    @emit 'messages-collected', _.size(@messages)

  destroy: ->
    @unsubscribe()
    @gocover.destroy()
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
    go = @goexecutable.current()
    unless go? and go.executable? and go.executable.trim() isnt ''
      @displayGoInfo(false)
      return

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
        @gocover.runCoverage(editorView, saving, callback)
    ], (err, modifymessages) =>
      @emit 'coverage-complete'
    )

  handleBufferSave: (editorView, saving) ->
    return unless @ready? and @ready
    return unless @isValidEditorView(editorView)
    @resetState(editorView)
    @triggerPipeline(editorView, saving)

  handleBufferChanged: (editorView) ->
    @gocover.resetCoverage()

  resetState: (editorView) ->
    @messages = []
    @resetGutter(editorView)
    @resetPanel()

  resetGutter: (editorView) ->
    return unless @isValidEditorView(editorView)
    if atom.config.get('core.useReactEditor')
      return unless editorView.getEditor()?
      # Find current markers
      markers = editorView.getEditor().getBuffer()?.findMarkers(class: 'go-plus')
      return unless markers? and _.size(markers) > 0
      # Remove markers
      marker.destroy() for marker in markers
    else
      gutter = editorView?.gutter
      return unless gutter?
      gutter.removeClassFromAllLines('go-plus-message')

  updateGutter: (editorView, messages) ->
    @resetGutter(editorView)
    return unless messages? and messages.length > 0
    if atom.config.get('core.useReactEditor')
      buffer = editorView?.getEditor()?.getBuffer()
      return unless buffer?
      for message in messages
        if message?.line? and message.line isnt false and message.line >= 0
          marker = buffer.markPosition([message.line - 1, 0], class: 'go-plus', invalidate: 'touch')
          editorView.getEditor().decorateMarker(marker, type: 'gutter', class: 'goplus-' + message.type)
    else
      gutter = editorView?.gutter
      return unless gutter?
      gutter.addClassToLine message.line - 1, 'go-plus-message' for message in messages

  resetPanel: ->
    @messagepanel?.close()
    @messagepanel?.clear()

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

  gettools: (updateExistingTools) =>
    updateExistingTools = updateExistingTools? and updateExistingTools
    @ready = false
    thego = @goexecutable.current()
    unless thego? and thego.executable? and thego.executable.trim() isnt ''
      @displayGoInfo(false)
      return
    unless thego.toolsAreMissing() or updateExistingTools
      @emitReady()
      return
    @resetPanel()
    @messagepanel.add new PlainMessageView message: 'Running `go get -u` to get required tools...', className: 'text-success'
    @messagepanel.attach()
    @goexecutable.on 'gettools-complete', =>
      @displayGoInfo(true)
      @emitReady()
    @goexecutable.gettools(thego, updateExistingTools)
