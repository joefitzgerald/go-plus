{Subscriber, Emitter} = require('emissary')
Gofmt = require('./gofmt')
Govet = require('./govet')
Golint = require('./golint')
Gopath = require('./gopath')
Gobuild = require('./gobuild')
Gocover = require('./gocover')
Executor = require('./executor')
Environment = require('./environment')
GoExecutable = require('./goexecutable')
Godef = require('./godef')
SplicerSplitter = require('./util/splicersplitter')
_ = require('underscore-plus')
{MessagePanelView, LineMessageView, PlainMessageView} = require('atom-message-panel')
path = require('path')
os = require('os')
async = require('async')

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
    @godef = new Godef(this)

    @messagepanel = new MessagePanelView({title: '<span class="icon-diff-added"></span> go-plus', rawTitle: true}) unless @messagepanel?

    # Reset State If Requested
    gofmtsubscription = @gofmt.on('reset', (editor) => @resetState(editor))
    golintsubscription = @golint.on('reset', (editor) => @resetState(editor))
    govetsubscription = @govet.on('reset', (editor) => @resetState(editor))
    gopathsubscription = @gopath.on('reset', (editor) => @resetState(editor))
    gobuildsubscription = @gobuild.on('reset', (editor) => @resetState(editor))
    gocoversubscription = @gocover.on('reset', (editor) => @resetState(editor))

    @subscribe(gofmtsubscription)
    @subscribe(golintsubscription)
    @subscribe(govetsubscription)
    @subscribe(gopathsubscription)
    @subscribe(gobuildsubscription)
    @subscribe(gocoversubscription)

    @on('dispatch-complete', (editor) => @displayMessages(editor))
    @subscribeToAtomEvents()
    @detect()

  destroy: =>
    @destroyItems()
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
    @godef.destroy()
    @gocover = null
    @gobuild = null
    @golint = null
    @govet = null
    @gopath = null
    @gofmt = null
    @godef = null
    @ready = false
    @activated = false
    @emit('destroyed')

  addItem: (item) ->
    return if item in @items

    if typeof item.on is 'function'
      @subscribe(item, 'destroyed', => @removeItem(item))

    @items.splice(0, 0, item)

  removeItem: (item) ->
    index = @items.indexOf(item)
    return if index is -1

    if typeof item.on is 'function'
      @unsubscribe(item)

    @items.splice(index, 1)

  destroyItems: ->
    return unless @items and _.size(@items) > 0
    for item in @items
      item.dispose()

  subscribeToAtomEvents: =>
    @addItem(atom.workspace.observeTextEditors((editor) => @handleEvents(editor)))
    @addItem(atom.workspace.onDidChangeActivePaneItem((event) => @resetPanel()))
    @addItem(atom.config.observe('go-plus.getMissingTools', => @gettools(false) if atom.config.get('go-plus.getMissingTools')? and atom.config.get('go-plus.getMissingTools') and @ready))
    @addItem(atom.config.observe('go-plus.formatTool', => @displayGoInfo(true) if @ready))
    @addItem(atom.config.observe('go-plus.goPath', => @displayGoInfo(true) if @ready))
    @addItem(atom.config.observe('go-plus.environmentOverridesConfiguration', => @displayGoInfo(true) if @ready))
    @addItem(atom.config.observe('go-plus.goInstallation', => @detect() if @ready))

    atom.commands.add 'atom-workspace',
      'golang:goinfo': => @displayGoInfo(true) if @ready and @activated

    atom.commands.add 'atom-workspace',
      'golang:getmissingtools': => @gettools(false) if @activated

    atom.commands.add 'atom-workspace',
      'golang:updatetools': => @gettools(true) if @activated

    @activated = true

  handleEvents: (editor) =>
    buffer = editor?.getBuffer()
    return unless buffer?
    @updateGutter(editor, @messages)
    modifiedsubscription = buffer.onDidStopChanging =>
      return unless @activated
      @handleBufferChanged(editor)

    savedsubscription = buffer.onDidSave =>
      return unless @activated
      return unless not @dispatching
      @handleBufferSave(editor, true)

    destroyedsubscription = buffer.onDidDestroy =>
      savedsubscription?.dispose()
      @removeItem(savedsubscription) if savedsubscription?
      modifiedsubscription?.dispose()
      @removeItem(modifiedsubscription) if modifiedsubscription?

    @addItem(modifiedsubscription)
    @addItem(savedsubscription)
    @addItem(destroyedsubscription)

  detect: =>
    @ready = false
    @goexecutable.detect().then (gos) =>
      @gettools(false) if atom.config.get('go-plus.getMissingTools')? and atom.config.get('go-plus.getMissingTools')
      @displayGoInfo(false)
      @emitReady()

  resetAndDisplayMessages: (editor, msgs) =>
    return unless @isValidEditor(editor)
    @resetState(editor)
    @collectMessages(msgs)
    @displayMessages(editor)

  displayMessages: (editor) =>
    @updatePane(editor, @messages)
    @updateGutter(editor, @messages)
    @dispatching = false
    @emit('display-complete')

  emitReady: =>
    @ready = true
    @emit('ready')

  displayGoInfo: (force) =>
    editor = atom.workspace?.getActiveTextEditor()
    unless force
      return unless @isValidEditor(editor)

    @resetPanel()
    go = @goexecutable.current()
    if go? and go.executable? and go.executable.trim() isnt ''
      @messagepanel.add(new PlainMessageView({raw: true, message: '<b>Go:</b> ' + go.name + ' (@' + go.executable + ')', className: 'text-info'}))

      # gopath
      gopath = go.buildgopath()
      if gopath? and gopath.trim() isnt ''
        @messagepanel.add(new PlainMessageView({raw: true, message: '<b>GOPATH:</b> ' + gopath, className: 'text-highlight'}))
      else
        @messagepanel.add(new PlainMessageView({raw: true, message: '<b>GOPATH:</b> Not Set (You Should Try Launching Atom Using The Shell Commands...)', className: 'text-error'}))

      # cover
      if go.cover()? and go.cover() isnt false
        @messagepanel.add(new PlainMessageView({raw: true, message: '<b>Cover Tool:</b> ' + go.cover(), className: 'text-subtle'}))
      else
        @messagepanel.add(new PlainMessageView({raw: true, message: '<b>Cover Tool:</b> Not Found', className: 'text-error'}))

      # vet
      if go.vet()? and go.vet() isnt false
        @messagepanel.add(new PlainMessageView({raw: true, message: '<b>Vet Tool:</b> ' + go.vet(), className: 'text-subtle'}))
      else
        @messagepanel.add(new PlainMessageView({raw: true, message: '<b>Vet Tool:</b> Not Found', className: 'text-error'}))

      # gofmt / goimports
      if go.format()? and go.format() isnt false
        @messagepanel.add(new PlainMessageView({raw: true, message: '<b>Format Tool:</b> ' + go.format(), className: 'text-subtle'}))
      else
        @messagepanel.add(new PlainMessageView({raw: true, message: '<b>Format Tool (' + atom.config.get('go-plus.formatTool') + '):</b> Not Found', className: 'text-error'}))

      # golint
      if go.golint()? and go.golint() isnt false
        @messagepanel.add(new PlainMessageView({raw: true, message: '<b>Lint Tool:</b> ' + go.golint(), className: 'text-subtle'}))
      else
        @messagepanel.add(new PlainMessageView({raw: true, message: '<b>Lint Tool:</b> Not Found', className: 'text-error'}))

      # gocode
      if go.gocode()? and go.gocode() isnt false
        @messagepanel.add(new PlainMessageView({raw: true, message: '<b>Gocode Tool:</b> ' + go.gocode(), className: 'text-subtle'}))
      else
        @messagepanel.add(new PlainMessageView({raw: true, message: '<b>Gocode Tool:</b> Not Found', className: 'text-error'}))

      # godef
      if go.godef()? and go.godef() isnt false
        @messagepanel.add(new PlainMessageView({raw: true, message: '<b>Godef Tool:</b> ' + go.godef(), className: 'text-subtle'}))
      else
        @messagepanel.add(new PlainMessageView({raw: true, message: '<b>Godef Tool:</b> Not Found', className: 'text-error'}))

      # gocode active
      if _.contains(atom.packages.getAvailablePackageNames(), 'autocomplete-plus')
        @messagepanel.add(new PlainMessageView({raw: true, message: '<b>Gocode Status:</b> Enabled', className: 'text-subtle'}))
      else
        @messagepanel.add(new PlainMessageView({raw: true, message: '<b>Gocode Status:</b> Not Enabled (autocomplete-plus needs to be installed and active; install it and restart)', className: 'text-warning'}))

      # oracle
      if go.oracle()? and go.oracle() isnt false
        @messagepanel.add(new PlainMessageView({raw: true, message: '<b>Oracle Tool: ' + go.oracle(), className: 'text-subtle'}))
      else
        @messagepanel.add(new PlainMessageView({raw: true, message: '<b>Oracle Tool: Not Found', className: 'text-error'}))

      # git
      if go.git()? and go.git() isnt false
        @messagepanel.add(new PlainMessageView({raw: true, message: '<b>Git:</b> ' + go.git(), className: 'text-subtle'}))
      else
        @messagepanel.add(new PlainMessageView({raw: true, message: '<b>Git:</b> Not Found', className: 'text-warning'}))

      # PATH
      thepath = if os.platform() is 'win32' then @env()?.Path else @env()?.PATH
      if thepath? and thepath.trim() isnt ''
        @messagepanel.add(new PlainMessageView({raw: true, message: '<b>PATH:</b> ' + thepath, className: 'text-subtle'}))
      else
        @messagepanel.add(new PlainMessageView({raw: true, message: '<b>PATH:</b> Not Set', className: 'text-error'}))
    else
      @messagepanel.add(new PlainMessageView({raw: true, message: 'No Go Installations Were Found', className: 'text-error'}))

    @messagepanel.add(new PlainMessageView({raw: true, message: '<b>Atom:</b> ' + atom.appVersion + ' (' + os.platform() + ' ' + os.arch() + ' ' + os.release() + ')', className: 'text-info'}))

    @messagepanel.attach()

  collectMessages: (messages) ->
    messages = _.flatten(messages) if messages? and _.size(messages) > 0
    messages = _.filter(messages, (element, index, list) -> return element?)
    return unless messages?
    messages = _.filter(messages, (message) -> message?)
    @messages = _.union(@messages, messages)
    @messages = _.uniq @messages, (element, index, list) ->
      return element?.line + ':' + element?.column + ':' + element?.msg
    @emit('messages-collected', _.size(@messages))

  triggerPipeline: (editor, saving) ->
    @dispatching = true
    go = @goexecutable.current()
    unless go? and go.executable? and go.executable.trim() isnt ''
      @displayGoInfo(false)
      @dispatching = false
      return

    async.series([
      (callback) =>
        @gofmt.formatBuffer(editor, saving, callback)
    ], (err, modifymessages) =>
      @collectMessages(modifymessages)
      async.parallel([
        (callback) =>
          @govet.checkBuffer(editor, saving, callback)
        (callback) =>
          @golint.checkBuffer(editor, saving, callback)
        (callback) =>
          @gopath.check(editor, saving, callback)
        (callback) =>
          @gobuild.checkBuffer(editor, saving, callback)
      ], (err, checkmessages) =>
        @collectMessages(checkmessages)
        @emit('dispatch-complete', editor)
      )
    )

    async.series([
      (callback) =>
        @gocover.runCoverage(editor, saving, callback)
    ], (err, modifymessages) =>
      @emit('coverage-complete')
    )

  handleBufferSave: (editor, saving) ->
    return unless @ready and @activated
    return unless @isValidEditor(editor)
    @resetState(editor)
    @triggerPipeline(editor, saving)

  handleBufferChanged: (editor) ->
    return unless @ready and @activated
    return unless @isValidEditor(editor)

  resetState: (editor) ->
    @messages = []
    @resetGutter(editor)
    @resetPanel()

  resetGutter: (editor) ->
    return unless @isValidEditor(editor)
    # Find current markers
    markers = editor?.getBuffer()?.findMarkers({class: 'go-plus'})
    return unless markers? and _.size(markers) > 0
    # Remove markers
    marker.destroy() for marker in markers

  updateGutter: (editor, messages) ->
    @resetGutter(editor)
    return unless @isValidEditor(editor)
    return unless messages? and messages.length > 0
    buffer = editor?.getBuffer()
    return unless buffer?
    for message in messages
      skip = false
      if message?.file? and message.file isnt ''
        skip = message.file isnt buffer?.getPath()

      unless skip
        if message?.line? and message.line isnt false and message.line >= 0
          try
            marker = buffer?.markPosition([message.line - 1, 0], {class: 'go-plus', invalidate: 'touch'})
            editor?.decorateMarker(marker, {type: 'line-number', class: 'goplus-' + message.type})
          catch error
            console.log(error)

  resetPanel: ->
    @messagepanel?.close()
    @messagepanel?.clear()

  updatePane: (editor, messages) ->
    @resetPanel
    return unless messages?
    if messages.length <= 0 and atom.config.get('go-plus.showPanelWhenNoIssuesExist')
      @messagepanel.add(new PlainMessageView({message: 'No Issues', className: 'text-success'}))
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
        @messagepanel.add(new PlainMessageView({message: message.msg, className: className}))
      else
        # LineMessageView
        @messagepanel.add(new LineMessageView({file: file, line: line, character: column, message: message.msg, className: className}))
    @messagepanel.attach() if atom?.workspace?

  isValidEditor: (editor) ->
    editor?.getGrammar()?.scopeName is 'source.go'

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
    @messagepanel.add(new PlainMessageView({message: 'Running `go get -u` to get required tools...', className: 'text-success'}))
    @messagepanel.attach()
    @goexecutable.on 'gettools-complete', =>
      @displayGoInfo(true)
      @emitReady()
    @goexecutable.gettools(thego, updateExistingTools)
