{Range}  = require('atom')
_ = require('underscore-plus')
path = require('path')

module.exports =
class GocodeProvider
  selector: '.source.go'
  inclusionPriority: 1
  excludeLowerPriority: true

  constructor: ->
    @disableForSelector = atom.config.get('go-plus.autocompleteBlacklist')

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
      offset = 'c' + index.toString()
      text = options.editor.getText()
      return resolve() if text[index - 1] is ')' or text[index - 1] is ';'
      quotedRange = options.editor.displayBuffer.bufferRangeForScopeAtPosition('.string.quoted', options.bufferPosition)
      return resolve() if quotedRange

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

      done = (exitcode, stdout, stderr, messages) =>
        console.log(@name + ' - stderr: ' + stderr) if stderr? and stderr.trim() isnt ''
        messages = @mapMessages(stdout, text, index) if stdout? and stdout.trim() isnt ''
        return resolve() if messages?.length < 1
        resolve(messages)

      @dispatch.executor.exec(cmd, cwd, env, done, args, text)
    )

  mapMessages: (data, text, index) ->
    return [] unless data?
    res = JSON.parse(data)

    numPrefix = res[0]
    candidates = res[1]

    return [] unless candidates

    suggestions = []
    for c in candidates
      suggestion =
        replacementPrefix: c.name.substring(0, numPrefix)
        rightLabel: c.type or c.class
        type: c.class
      if c.class is 'func'
        suggestion.snippet = c.name + @generateSignature(c.type)
        suggestion.rightLabel = c.class
      else
        suggestion.text = c.name
      suggestions.push(suggestion)

    return suggestions

  generateSignature: (type) ->
    signature = ""
    skipBlank = false
    parenCounter = 0
    paramCount = 1
    scanned = false
    match = @funcRegex.exec(type)
    return '()' unless match? and match[0]? # Not a function
    return '()' unless match[1]? and match[1] isnt '' # Has no arguments, shouldn't be a snippet, for now
    args = match[1].split(/, /)
    args = _.map args, (a) ->
      return a unless a?.length > 2
      if a.substring(a.length - 2, a.length) is '{}'
        return a.substring(0, a.length - 2)
      return a

    return '(${1:' + args[0] + '})' if args.length is 1
    i = 1
    for arg in args
      if i is 1
        signature = '(${' + i + ':' + arg + '}'
      else
        signature = signature + ', ${' + i + ':' + arg + '}'
      i = i + 1

    signature = signature + ')'
    return signature
    # TODO: Emit function's result(s) in snippet, when appropriate

  dispose: ->
    @dispatch = null
