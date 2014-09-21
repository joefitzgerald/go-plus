{Subscriber, Emitter} = require 'emissary'
Gofmt = require './gofmt'
Govet = require './govet'
Golint = require './golint'
Gopath = require './gopath'
Gobuild = require './gobuild'
Gocover = require './gocover'
Executor = require './executor'
Environment = require './environment'
GoExecutable = require './goexecutable'
SplicerSplitter = require './util/splicersplitter'
_ = require 'underscore-plus'
{MessagePanelView, LineMessageView, PlainMessageView} = require 'atom-message-panel'
{$, SettingsView} = require 'atom'
path = require 'path'
os = require 'os'
async = require 'async'

module.exports =
class Dispatch
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: ->
    # Manage Save Pipeline
    @activated = false
    @dispatching = false
    @ready = false
    @messages = []
    @items = []

    @environment = new Environment(process.env)
    @executor = new Executor(@environment.Clone())
    @splicersplitter = new SplicerSplitter()
    @goexecutable = new GoExecutable(@env())

    @gofmt = new Gofmt(this)
    @govet = new Govet(this)
    @golint = new Golint(this)
    @gopath = new Gopath(this)
    @gobuild = new Gobuild(this)
    @gocover = new Gocover(this)

    @messagepanel = new MessagePanelView title: '<span class="icon-diff-added"></span> go-plus', rawTitle: true unless @messagepanel?

    @on 'run-detect', => @detect()

    # Reset State If Requested
    gofmtsubscription = @gofmt.on 'reset', (editorView) => @resetState(editorView)
    golintsubscription = @golint.on 'reset', (editorView) => @resetState(editorView)
    govetsubscription = @govet.on 'reset', (editorView) => @resetState(editorView)
    gopathsubscription = @gopath.on 'reset', (editorView) => @resetState(editorView)
    gobuildsubscription = @gobuild.on 'reset', (editorView) => @resetState(editorView)
    gocoversubscription = @gocover.on 'reset', (editorView) => @resetState(editorView)

    @subscribe(gofmtsubscription)
    @subscribe(golintsubscription)
    @subscribe(govetsubscription)
    @subscribe(gopathsubscription)
    @subscribe(gobuildsubscription)
    @subscribe(gocoversubscription)

    @on 'dispatch-complete', (editorView) => @displayMessages(editorView)
    @subscribeToAtomEvents()
    @emit 'run-detect'

  destroy: =>
    @destroyItems()
    @unsubscribeFromAtomEvents()
    @unsubscribe()
    @resetPanel()
    @messagepanel?.remove()
    @messagepanel = null
    @gocover.destroy()
    @gobuild.destroy()
    @golint.destroy()
    @govet.destroy()
    @gopath.destroy()
    @gofmt.destroy()
    @gocover = null
    @gobuild = null
    @golint = null
    @govet = null
    @gopath = null
    @gofmt = null
    @ready = false
    @activated = false
    @emit 'destroyed'

  addItem: (item) ->
    return if item in @items

    if typeof item.on is 'function'
      @subscribe item, 'destroyed', => @removeItem(item)

    @items.splice(0, 0, item)

  removeItem: (item) ->
    index = @items.indexOf(item)
    return if index is -1

    if typeof item.on is 'function'
      @unsubscribe item

    @items.splice(index, 1)

  destroyItems: ->
    return unless @items and _.size(@items) > 0
    for item in @items
      item.dispose()

  subscribeToAtomEvents: =>
    @editorViewSubscription = atom.workspaceView.eachEditorView (editorView) => @handleEvents(editorView)
    @workspaceViewSubscription = atom.workspaceView.on 'pane-container:active-pane-item-changed', => @resetPanel()
    @getMissingToolsSubscription = atom.config.observe 'go-plus.getMissingTools', => @gettools(false) if atom.config.get('go-plus.getMissingTools')? and atom.config.get('go-plus.getMissingTools') and @ready
    @formatWithGoImportsSubscription = atom.config.observe 'go-plus.formatWithGoImports', => @displayGoInfo(true) if @ready
    @gopathSubscription = atom.config.observe 'go-plus.goPath', => @displayGoInfo(true) if @ready
    @environmentOverridesConfigurationSubscription = atom.config.observe 'go-plus.environmentOverridesConfiguration', => @displayGoInfo(true) if @ready
    @goInstallationSubscription = atom.config.observe 'go-plus.goInstallation', => @detect() if @ready
    @goinfoCommandSubscription = atom.workspaceView.command 'golang:goinfo', => @displayGoInfo(true) if @ready and @activated
    @getmissingtoolsCommandSubscription = atom.workspaceView.command 'golang:getmissingtools', => @gettools(false) if @activated
    @updatetoolsCommandSubscription = atom.workspaceView.command 'golang:updatetools', => @gettools(true) if @activated

    @subscribe(@getMissingToolsSubscription)
    @subscribe(@formatWithGoImportsSubscription)
    @subscribe(@gopathSubscription)
    @subscribe(@environmentOverridesConfigurationSubscription)
    @subscribe(@goInstallationSubscription)
    @activated = true

  handleEvents: (editorView) =>
    buffer = editorView?.getEditor()?.getBuffer()
    return unless buffer?
    @updateGutter(editorView, @messages)
    modifiedsubscription = buffer.onDidStopChanging =>
      return unless @activated
      @handleBufferChanged(editorView)

    savedsubscription = buffer.onDidSave =>
      return unless @activated
      return unless not @dispatching
      @handleBufferSave(editorView, true)

    destroyedsubscription = buffer.onDidDestroy =>
      savedsubscription?.dispose()
      @removeItem(savedsubscription) if savedsubscription?
      modifiedsubscription?.dispose()
      @removeItem(modifiedsubscription) if modifiedsubscription?

    @addItem(modifiedsubscription)
    @addItem(savedsubscription)
    @addItem(destroyedsubscription)

  unsubscribeFromAtomEvents: =>
    @editorViewSubscription?.off()

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
        @messagepanel.add new PlainMessageView message: 'Format Tool (goimports): Not Found', className: 'text-error' if atom.config.get('go-plus.formatWithGoImports')
        @messagepanel.add new PlainMessageView message: 'Format Tool (gofmt): Not Found', className: 'text-error' unless atom.config.get('go-plus.formatWithGoImports')

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

      # PATH
      thepath = if os.platform() is 'win32' then @env()?.Path else @env()?.PATH
      if thepath? and thepath.trim() isnt ''
        @messagepanel.add new PlainMessageView message: 'PATH: ' + thepath, className: 'text-success'
      else
        @messagepanel.add new PlainMessageView message: 'PATH: Not Set', className: 'text-error'
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

  triggerPipeline: (editorView, saving) ->
    @dispatching = true
    go = @goexecutable.current()
    unless go? and go.executable? and go.executable.trim() isnt ''
      @displayGoInfo(false)
      @dispatching = false
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
    return unless @ready and @activated
    return unless @isValidEditorView(editorView)
    @resetState(editorView)
    @triggerPipeline(editorView, saving)

  handleBufferChanged: (editorView) ->
    return unless @ready and @activated
    return unless @isValidEditorView(editorView)
    @gocover.resetCoverage()

  resetState: (editorView) ->
    @messages = []
    @resetGutter(editorView)
    @resetPanel()

  resetGutter: (editorView) ->
    return unless @isValidEditorView(editorView)
    return unless editorView.getEditor()?
    # Find current markers
    markers = editorView.getEditor().getBuffer()?.findMarkers(class: 'go-plus')
    return unless markers? and _.size(markers) > 0
    # Remove markers
    marker.destroy() for marker in markers

  updateGutter: (editorView, messages) ->
    @resetGutter(editorView)
    return unless messages? and messages.length > 0
    buffer = editorView?.getEditor()?.getBuffer()
    return unless buffer?
    for message in messages
      skip = false
      if message?.file? and message.file isnt ''
        skip = message.file isnt buffer.getPath()

      unless skip
        if message?.line? and message.line isnt false and message.line >= 0
          marker = buffer.markPosition([message.line - 1, 0], class: 'go-plus', invalidate: 'touch')
          editorView.getEditor().decorateMarker(marker, type: 'gutter', class: 'goplus-' + message.type)

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

      file = if message.file? and message.file.trim() isnt '' then message.file else null
      file = atom.project.relativize(file) if file? and file isnt '' and atom?.project?
      column = if message.column? and message.column isnt '' and message.column isnt false then message.column else null
      line = if message.line? and message.line isnt '' and message.line isnt false then message.line else null

      if file is null and column is null and line is null
        # PlainMessageView
        @messagepanel.add new PlainMessageView message: message.msg, className: className
      else
        # LineMessageView
        @messagepanel.add new LineMessageView file: file, line: line, character: column, message: message.msg, className: className
    @messagepanel.attach() if atom?.workspaceView?

  isValidEditorView: (editorView) ->
    editorView?.getEditor()?.getGrammar()?.scopeName is 'source.go'

  env: ->
    @environment.Clone()

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
