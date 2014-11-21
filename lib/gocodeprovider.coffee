_ = require 'underscore-plus'
path = require 'path'

module.exports =
ProviderClass: (Provider, Suggestion, dispatch)  ->

  class GocodeProvider extends Provider
    exclusive: true

    empty: [new Suggestion(this, word: '')]

    buildSuggestions: () ->
      unless dispatch.isValidEditor(@editor)
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

      go = dispatch.goexecutable.current()
      gopath = go.buildgopath()
      if not gopath? or gopath is ''
        return @empty
      env = dispatch.env()
      env['GOPATH'] = gopath
      cwd = path.dirname(buffer.getPath())
      args = ['-f=json', 'autocomplete', buffer.getPath(), offset]
      configArgs = dispatch.splicersplitter.splitAndSquashToArray(' ', atom.config.get('go-plus.gocodeArgs'))
      args = _.union(configArgs, args) if configArgs? and _.size(configArgs) > 0
      cmd = dispatch.goexecutable.current().gocode()
      if cmd is false
        message =
          line: false
          column: false
          msg: 'GoCode Tool Missing'
          type: 'error'
          source: @name
        console.error(message)
        return @empty

      result = dispatch.executor.execSync(cmd, cwd, env, args, text)

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
