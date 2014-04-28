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
    @unsubscribe

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
    console.log 'checking GOPATH: ' + gopath
    errors = []
    unless gopath? and gopath isnt ''
      error =
          line: false
          column: false
          msg: 'Warning: GOPATH is not set – either set the GOPATH environment variable or define the Go Path in go-plus package preferences'
      errors.push error

    unless fs.existsSync(gopath)
      error =
          line: false
          column: false
          msg: 'Warning: GOPATH [' + gopath + '] does not exist'
      errors.push error

    unless fs.existsSync(path.join(gopath, 'src'))
      error =
          line: false
          column: false
          msg: 'Warning: GOPATH [' + gopath + '] does not contain a "src" directory - please review http://golang.org/doc/code.html#Workspaces'
      errors.push error

    if errors? and _.size(errors) > 0
      @emit @name + '-errors', editorView, errors

    @emit @name + '-complete', editorView, saving
    return
