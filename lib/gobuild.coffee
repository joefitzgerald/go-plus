spawn = require('child_process').spawn
fs = require 'fs-plus'
path = require 'path'
{Subscriber, Emitter} = require 'emissary'

module.exports =
class Gobuild
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: ->
    atom.workspaceView.command "golang:gobuild", => @gobuild.checkCurrentBuffer()

  destroy: ->
    @unsubscribe

  reset: ->
    @emit "reset"

  checkCurrentBuffer: ->
    # TODO: Figure Out How To Get Active EditorView
    editor = atom.workspace.getActiveEditor()
    @reset
    @checkBuffer(editor, false)

  checkBuffer: (editorView, saving) ->
    editor = editorView.getEditor()
    grammar = editor.getGrammar()
    return if grammar.scopeName isnt 'source.go'
    if saving and not atom.config.get('go-plus.syntaxCheckOnSave')
      @emit 'syntaxcheck-complete', editorView, saving
      return
    buffer = editor.getBuffer()
    gopath = @buildGoPath()
    if not gopath? or gopath is ''
      errors = []
      error =
          line: false
          column: false
          msg: 'Warning: GOPATH is not set – either set the GOPATH environment variable or define the Go Path in go-plus package preferences'
      errors.push error
      @emit "syntaxcheck-errors", editorView, errors
      @emit 'syntaxcheck-complete', editorView, saving
      return
    env = process.env
    env["GOPATH"] = gopath
    re = new RegExp(buffer.getBaseName() + '$')
    cwd = buffer.getPath().replace(re, '')
    output = ''
    args = []
    if buffer.getPath().match(/_test.go$/i)
      pre = /^\w*package ([\d\w]+){1}\w*$/img # Need To Support Unicode Letters Also
      match = pre.exec(buffer.getText())
      testPackage = match[1]
      testPackage = testPackage.replace(/_test$/i, '')
      output = testPackage + '.test'
      args = ["test", "-c", buffer.getPath()]
    else
      output = '.go-plus-syntax-check'
      args = ["build", "-o", output, buffer.getPath()]
    syntaxCheckCmd = atom.config.get('go-plus.goExecutablePath')
    syntaxCheck = spawn(syntaxCheckCmd, args, {cwd: cwd, env: env})
    syntaxCheck.on 'error', (error) => console.log 'syntaxcheck: error launching command [' + syntaxCheckCmd + '] – ' + error  + ' – current PATH: [' + process.env.PATH + ']' if error?
    syntaxCheck.stderr.on 'data', (data) => @mapErrors(editorView, data)
    syntaxCheck.stdout.on 'data', (data) => console.log 'syntaxcheck: ' + data if data?
    syntaxCheck.on 'close', (code) =>
      console.log 'syntaxcheck: [' + syntaxCheckCmd + '] exited with code [' + code + ']' if code isnt 0
      syntaxCheckOutputFile = path.join(cwd, output)
      if fs.existsSync(syntaxCheckOutputFile)
        fs.unlinkSync(syntaxCheckOutputFile)
      @emit 'syntaxcheck-complete', editorView, saving

  buildGoPath: ->
    gopath = ''
    gopathEnv = process.env.GOPATH
    gopathConfig = atom.config.get('go-plus.goPath')
    environmentOverridesConfig = atom.config.get('go-plus.environmentOverridesConfiguration')
    environmentOverridesConfig ?= true
    gopath = gopathEnv if gopathEnv? and gopathEnv isnt ''
    gopath = gopathConfig if not environmentOverridesConfig and gopathConfig? and gopathConfig isnt ''
    gopath = gopathConfig if gopath is ''
    return gopath

  mapErrors: (editorView, data) ->
    pattern = /^(.*?):(\d*?):((\d*?):)?\s(.*)$/img
    errors = []
    extract = (matchLine) ->
      return unless matchLine?
      error = switch
        when matchLine[4]?
          line: matchLine[2]
          column: matchLine[4]
          msg: matchLine[5]
        else
          line: matchLine[2]
          column: false
          msg: matchLine[5]
      errors.push error
    loop
      match = pattern.exec(data)
      extract(match)
      break unless match?
    @emit "syntaxcheck-errors", editorView, errors
