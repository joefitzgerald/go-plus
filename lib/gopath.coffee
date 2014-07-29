path = require 'path'
fs = require 'fs-plus'
_ = require 'underscore-plus'
{Subscriber, Emitter} = require 'emissary'

module.exports =
class Gopath
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (dispatch) ->
    @dispatch = dispatch
    @name = 'gopath'

  destroy: ->
    @unsubscribe()
    @dispatch = null

  reset: (editorView) ->
    @emit 'reset', editorView

  check: (editorView, saving, callback = ->) ->
    unless @dispatch.isValidEditorView(editorView)
      @emit @name + '-complete', editorView, saving
      callback(null)
      return

    # Only Check GOPATH If Syntax Checking (For Now)
    unless atom.config.get('go-plus.syntaxCheckOnSave')
      @emit @name + '-complete', editorView, saving
      callback(null)
      return

    gopaths = @dispatch.goexecutable.current().splitgopath()
    messages = []
    unless gopaths? and _.size(gopaths) > 0
      message =
          line: false
          column: false
          msg: 'Warning: GOPATH is not set – either set the GOPATH environment variable or define the Go Path in go-plus package preferences'
          type: 'warning'
          source: 'gopath'
      messages.push message

    if messages? and _.size(messages) is 0
      for gopath in gopaths
        unless fs.existsSync(gopath)
          message =
              line: false
              column: false
              msg: 'Warning: GOPATH [' + gopaths[0] + '] does not exist'
              type: 'warning'
              source: 'gopath'
          messages.push message

    if messages? and _.size(messages) is 0
      for gopath in gopaths
        unless fs.existsSync(path.join(gopath, 'src'))
          message =
              line: false
              column: false
              msg: 'Warning: GOPATH [' + gopaths[0] + '] does not contain a "src" directory - please review http://golang.org/doc/code.html#Workspaces'
              type: 'warning'
              source: 'gopath'
          messages.push message

    if messages? and _.size(messages) is 0
      filepath = editorView?.getEditor()?.getPath()
      if filepath? and filepath isnt '' and fs.existsSync(filepath)
        filepath = fs.realpathSync(filepath)
        found = false
        for gopath in gopaths
          if fs.existsSync(gopath)
            gopath = fs.realpathSync(gopath)
            if filepath.toLowerCase().startsWith(path.join(gopath, 'src').toLowerCase())
              found = true

        unless found
          message =
              line: false
              column: false
              msg: 'Warning: File [' + filepath + '] does not reside within a "src" directory in your GOPATH [' + gopaths + '] - please review http://golang.org/doc/code.html#Workspaces'
              type: 'warning'
              source: 'gopath'
          messages.push message

    if messages? and _.size(messages) > 0
      @emit @name + '-messages', editorView, messages
      callback(null, messages)
      return

    @emit @name + '-complete', editorView, saving
    callback(null)
    return
