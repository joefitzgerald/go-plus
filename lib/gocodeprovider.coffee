{Range, CompositeDisposable}  = require('atom')
_ = require('underscore-plus')
path = require('path')
{filter} = require 'fuzzaldrin'

module.exports =
class GocodeProvider
  selector: '.source.go'
  inclusionPriority: 1
  excludeLowerPriority: true
  suppressForCharacters: []

  constructor: ->
    @subscriptions = new CompositeDisposable
    @disableForSelector = atom.config.get('go-plus.autocompleteBlacklist')
    @subscriptions.add atom.config.observe 'go-plus.suppressAutocompleteActivationForCharacters', (value) =>
      @suppressForCharacters = _.map value, (c) ->
        char = c?.trim() or ''
        char = switch
          when char.toLowerCase() is 'comma' then ','
          when char.toLowerCase() is 'newline' then '\n'
          when char.toLowerCase() is 'space' then ' '
          when char.toLowerCase() is 'tab' then '\t'
          else char
        return char
      @suppressForCharacters = _.compact(@suppressForCharacters)
    @cachedCandidates = []
    @lastIndex = 0

  setDispatch: (dispatch) ->
    @dispatch = dispatch
    @funcRegex  = /^(?:func[(]{1})([^\)]*)(?:[)]{1})(?:$|(?:\s)([^\(]*$)|(?: [(]{1})([^\)]*)(?:[)]{1}))/i

  getSuggestions: (options) ->
    return new Promise((resolve) =>
      return resolve() unless options?
      return resolve() unless @dispatch?.isValidEditor(options.editor)
      buffer = options.editor.getBuffer()
      return resolve() unless buffer?

      go = @dispatch.goexecutable.current()
      return resolve() unless go?
      gopath = go.buildgopath()
      return resolve() if not gopath? or gopath is ''

      return resolve() unless options.bufferPosition
      index = buffer.characterIndexForPosition(options.bufferPosition)
      text = options.editor.getText()
      return resolve() if index > 0 and text[index - 1] in @suppressForCharacters
      quotedRange = options.editor.displayBuffer.bufferRangeForScopeAtPosition('.string.quoted', options.bufferPosition)
      return resolve() if quotedRange

      offset = Buffer.byteLength(text.substring(0, index), "utf8")

      env = @dispatch.env()
      env['GOPATH'] = gopath
      cwd = path.dirname(buffer.getPath())
      args = ['-f=json', 'autocomplete', buffer.getPath(), offset]
      configArgs = @dispatch.splicersplitter.splitAndSquashToArray(' ', atom.config.get('go-plus.gocodeArgs'))
      args = _.union(configArgs, args) if configArgs? and _.size(configArgs) > 0
      cmd = go.gocode()
      if cmd is false
        message =
          line: false
          column: false
          msg: 'gocode Tool Missing'
          type: 'error'
          source: @name
        resolve()
        return

      done = (exitcode, stdout, stderr, suggestions) =>
        fuzz = atom.config.get('go-plus.fuzzyAutocomplete')
        console.log(@name + ' - stderr: ' + stderr) if stderr? and stderr.trim() isnt ''
        candidates = @getCandidates(stdout, options.editor, options.bufferPosition) if stdout? and stdout.trim() isnt ''
        if fuzz
          if index < @lastIndex && candidates.length != 0 || @makeSuggestions(options.prefix, @cachedCandidates, fuzz).length == 0
            @cachedCandidates = candidates
          candidates = @cachedCandidates
        @lastIndex = index
        suggestions = @makeSuggestions(options.prefix, candidates, fuzz)
        return resolve() if suggestions?.length < 1
        resolve(suggestions)

      @dispatch.executor.exec(cmd, cwd, env, done, args, text)
    )

  makeSuggestions: (prefix, candidates, fuzz) ->
    return [] if candidates.length == 0

    if fuzz
      candidates = candidates.filter (e) -> e.name[0].toUpperCase() == prefix[0].toUpperCase()
      candidates = filter(candidates,prefix,key:'name')

    suggestions = []
    for c in candidates
      suggestion =
        replacementPrefix: prefix
        leftLabel: c.type or c.class
        type: @translateType(c.class)

      if c.class is 'func'
        suggestion = @upgradeSuggestion(suggestion, c)
      else
        suggestion.text = c.name

      suggestion.iconHTML = '<i class="icon-package"></i>' if suggestion.type is 'package'
      suggestions.push(suggestion)

    return suggestions

  getCandidates: (data, editor, position) ->
    return [] unless data?
    res = JSON.parse(data)

    numPrefix = res[0]
    candidates = res[1]

    return [] unless candidates
    return candidates

  translateType: (type) ->
    switch type
      when 'func' then 'function'
      when 'var' then 'variable'
      when 'const' then 'constant'
      when 'PANIC' then 'panic'
      else type

  upgradeSuggestion: (suggestion, c) ->
    return suggestion unless c.type? and c.type isnt ''
    match = @funcRegex.exec(c.type)
    unless match? and match[0]? # Not a function
      suggestion.snippet = c.name + '()'
      suggestion.leftLabel = ''
      return suggestion

    suggestion.leftLabel = match[2] or match[3] or ''
    suggestion.snippet = @generateSnippet(c.name, match)
    return suggestion

  generateSnippet: (name, match) ->
    signature = name
    return signature + '()' unless match[1]? and match[1] isnt '' # Has no arguments, shouldn't be a snippet, for now
    args = match[1].split(/, /)
    args = _.map args, (a) ->
      return a unless a?.length > 2
      if a.substring(a.length - 2, a.length) is '{}'
        return a.substring(0, a.length - 1) + '\\}'
      return a

    return signature + '(${1:' + args[0] + '})' if args.length is 1
    i = 1
    for arg in args
      if i is 1
        signature = signature + '(${' + i + ':' + arg + '}'
      else
        signature = signature + ', ${' + i + ':' + arg + '}'
      i = i + 1

    signature = signature + ')'
    return signature
    # TODO: Emit function's result(s) in snippet, when appropriate

  dispose: ->
    @subscriptions?.dispose()
    @subscriptions = null
    @disableForSelector = null
    @suppressForCharacters = null
    @dispatch = null
