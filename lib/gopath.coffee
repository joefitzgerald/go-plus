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

  reset: (editorView) ->
    @emit 'reset', editorView

  check: (editorView, saving) ->
    unless @dispatch.isValidEditorView(editorView)
      @emit @name + '-complete', editorView, saving
      return

    # Only Check GOPATH If Syntax Checking (For Now)
    unless atom.config.get('go-plus.syntaxCheckOnSave')
      @emit @name + '-complete', editorView, saving
      return

    gopath = @dispatch.buildGoPath()
    messages = []
    unless gopath? and gopath isnt ''
      message =
          line: false
          column: false
          msg: 'Warning: GOPATH is not set – either set the GOPATH environment variable or define the Go Path in go-plus package preferences'
          type: 'warning'
      messages.push message

    gopathelem = gopath
    gopathelem = gopath.split(':')[0] if gopath.indexOf(':') isnt -1

    if messages? and _.size(messages) is 0 and not fs.existsSync(gopathelem)
      message =
          line: false
          column: false
          msg: 'Warning: GOPATH [' + gopathelem + '] does not exist'
          type: 'warning'
      messages.push message

    if messages? and _.size(messages) is 0 and not fs.existsSync(path.join(gopathelem, 'src'))
      message =
          line: false
          column: false
          msg: 'Warning: GOPATH [' + gopathelem + '] does not contain a "src" directory - please review http://golang.org/doc/code.html#Workspaces'
          type: 'warning'
      messages.push message

    if messages? and _.size(messages) > 0
      @emit @name + '-messages', editorView, messages

    @emit @name + '-complete', editorView, saving
    return
