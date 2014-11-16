{spawn} = require 'child_process'
{Subscriber, Emitter} = require 'emissary'
{Provider, Suggestion} = require 'autocomplete-plus'
path = require 'path'
_ = require 'underscore-plus'

module.exports =
class Gocode
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (dispatch) ->
    @dispatch = dispatch
    @name = 'gocode'
    @editorSubscription = null
    @autocomplete = null
    @providers = []
    @activate()

  destroy: ->
    @deactivate()
    @unsubscribe()
    @dispatch = null

  reset: (editor) ->
    @emit 'reset', editor

  activate: ->
    atom.packages.activatePackage('autocomplete-plus')
      .then (pkg) =>
        @autocomplete = pkg.mainModule
        @registerProviders()

  registerProviders: ->
    @editorSubscription = atom.workspaceView.eachEditorView (editorView) =>
      if editorView.attached and not editorView.mini
        provider = new GocodeProvider editorView
        provider.setDispancher @dispatch

        @autocomplete.registerProviderForEditorView provider, editorView

        @providers.push provider

  deactivate: ->
    @editorSubscription?.off()
    @editorSubscription = null

    @providers.forEach (provider) =>
      @autocomplete.unregisterProvider provider

    @providers = []

class GocodeProvider extends Provider

  setDispancher: (dispatch) ->
    @dispatch = dispatch

  exclusive: true

  empty: [new Suggestion(this, word: '')]

  buildSuggestions: () ->
    unless @dispatch.isValidEditor(@editor)
      return @empty
    buffer = @editor?.getBuffer()
    unless buffer?
      return @empty

    position = @editor.getCursorBufferPosition()
    index = buffer.characterIndexForPosition(position)
    offset = 'c' + index.toString()
    text = @editor.getText()
    return @empty if text[index-1] == ')' or text[index-1] == ';'
    quotedRange = this.editor.displayBuffer.bufferRangeForScopeAtPosition('.string.quoted', position)
    return @empty if quotedRange

    go = @dispatch.goexecutable.current()
    gopath = go.buildgopath()
    if not gopath? or gopath is ''
      return @empty
    env = @dispatch.env()
    env['GOPATH'] = gopath
    cwd = path.dirname(buffer.getPath())
    args = ['-f=json', 'autocomplete', offset]
    configArgs = @dispatch.splicersplitter.splitAndSquashToArray(' ', atom.config.get('go-plus.gocodeArgs'))
    args = _.union(configArgs, args) if configArgs? and _.size(configArgs) > 0
    cmd = @dispatch.goexecutable.current().gocode()
    if cmd is false
      message =
        line: false
        column: false
        msg: 'GoCode Tool Missing'
        type: 'error'
        source: @name
      console.error(message)
      return @empty

    result = @dispatch.executor.execSync(cmd, cwd, env, args, text)

    console.log @name + ' - stderr: ' + result.stderr if result.stderr? and result.stderr.trim() isnt ''
    messages = @mapMessages(result.stdout, text, index, cwd) if result.stdout? and result.stdout.trim() isnt ''
    return messages if messages.length > 0
    return @empty

  mapMessages: (data, text, index, cwd) ->
    res = JSON.parse(data)

    numPrefix = res[0]
    candidates = res[1]

    return [] unless candidates

    suggestions = []
    for c in candidates
      prefix = c.name.substring 0, numPrefix

      word = c.name
      word += '(' if c.class is 'func' and text[index] != '('

      label = c.type or c.class

      suggestions.push new Suggestion(this, word: word, prefix: prefix, label: label)

    return suggestions
