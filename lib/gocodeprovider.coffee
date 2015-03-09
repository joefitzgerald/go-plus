{Range}  = require('atom')
_ = require('underscore-plus')
path = require('path')

module.exports =
class GocodeProvider
  id: 'go-plus-gocodeprovider'
  selector: '.source.go'

  constructor: ->
    @blacklist = atom.config.get('go-plus.autocompleteBlacklist')
    if atom.config.get('go-plus.suppressBuiltinAutocompleteProvider')
      @providerblacklist =
        'autocomplete-plus-fuzzyprovider': '.source.go'

  setDispatch: (dispatch) ->
    @dispatch = dispatch

  requestHandler: (options) ->
    return new Promise((resolve) =>
      return resolve() unless options?
      return resolve() unless @dispatch?.isValidEditor(options.editor)
      return resolve() unless options.buffer?

      go = @dispatch.goexecutable.current()
      return resolve() unless go?
      gopath = go.buildgopath()
      return resolve() if not gopath? or gopath is ''

      return resolve() unless options.position
      index = options.buffer.characterIndexForPosition(options.position)
      offset = 'c' + index.toString()
      text = options.editor.getText()
      return resolve() if text[index - 1] is ')' or text[index - 1] is ';'
      quotedRange = options.editor.displayBuffer.bufferRangeForScopeAtPosition('.string.quoted', options.position)
      return resolve() if quotedRange

      env = @dispatch.env()
      env['GOPATH'] = gopath
      cwd = path.dirname(options.buffer.getPath())
      args = ['-f=json', 'autocomplete', options.buffer.getPath(), offset]
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
    console.log(res)
    numPrefix = res[0]
    candidates = res[1]



    return [] unless candidates

    suggestions = []
    for c in candidates
      suggestion =
        prefix: c.name.substring(0, numPrefix)
        label: c.type or c.class
      if c.class is 'func'
        suggestion.snippet = c.name + @generateSignature(c.type)
        suggestion.label = c.class
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

    for char, index in type.split ''
      if skipBlank
        skipBlank = false
        continue
      if char == "("
        parenCounter++
        scanned = true
        signature += "(${" + paramCount + ":"
        paramCount++
      else if char == ")"
        parenCounter--
        signature += "})"
      else if parenCounter > 0 && char == ","
        signature += "}, ${" + paramCount + ":"
        paramCount++
        skipBlank = true
      else if parenCounter > 0
        signature += char
      if scanned && parenCounter == 0
        break

    return signature

  dispose: ->
    @dispatch = null
