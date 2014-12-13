_ = require 'underscore-plus'
path = require 'path'

module.exports =
ProviderClass: (Provider, Suggestion, dispatch)  ->

  class GocodeProvider extends Provider
    exclusive: true

    buildSuggestions: () ->
      return unless dispatch?.isValidEditor(@editor)
      buffer = @editor?.getBuffer()
      return unless buffer?

      go = dispatch.goexecutable.current()
      return unless go?
      gopath = go.buildgopath()
      return if not gopath? or gopath is ''

      position = @editor.getCursorBufferPosition()
      return unless position
      index = buffer.characterIndexForPosition(position)
      offset = 'c' + index.toString()
      text = @editor.getText()
      return if text[index-1] == ')' or text[index-1] == ';'
      quotedRange = this.editor.displayBuffer.bufferRangeForScopeAtPosition('.string.quoted', position)
      return if quotedRange

      env = dispatch.env()
      env['GOPATH'] = gopath
      cwd = path.dirname(buffer.getPath())
      args = ['-f=json', 'autocomplete', buffer.getPath(), offset]
      configArgs = dispatch.splicersplitter.splitAndSquashToArray(' ', atom.config.get('go-plus.gocodeArgs'))
      args = _.union(configArgs, args) if configArgs? and _.size(configArgs) > 0
      cmd = go.gocode()
      if cmd is false
        message =
          line: false
          column: false
          msg: 'gocode Tool Missing'
          type: 'error'
          source: @name

        return

      result = dispatch.executor.execSync(cmd, cwd, env, args, text)
      console.log @name + ' - stderr: ' + result.stderr if result.stderr? and result.stderr.trim() isnt ''
      messages = @mapMessages(result.stdout, text, index) if result.stdout? and result.stdout.trim() isnt ''
      return if messages?.length < 1
      return messages

    mapMessages: (data, text, index) ->
      return [] unless data?
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
