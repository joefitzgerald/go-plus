spawn = require('child_process').spawn
{Subscriber, Emitter} = require 'emissary'
_ = require 'underscore-plus'

module.exports =
class Gofmt
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (dispatch) ->
    atom.workspaceView.command 'golang:gofmt', => @formatCurrentBuffer()
    @dispatch = dispatch
    @name = 'fmt'

  destroy: ->
    @unsubscribe()

  reset: (editorView) ->
    @emit 'reset', editorView

  formatCurrentBuffer: ->
    editorView = atom.workspaceView.getActiveView()
    return unless editorView?
    @reset editorView
    @formatBuffer(editorView, false)

  formatBuffer: (editorView, saving) ->
    unless @dispatch.isValidEditorView(editorView)
      @emit @name + '-complete', editorView, saving
      return
    if saving and not atom.config.get('go-plus.formatOnSave')
      @emit @name + '-complete', editorView, saving
      return
    buffer = editorView?.getEditor()?.getBuffer()
    unless buffer?
      @emit @name + '-complete', editorView, saving
      return
    gopath = @dispatch.buildGoPath()
    args = ['-w']
    configArgs = @dispatch.splitToArray(atom.config.get('go-plus.gofmtArgs'))
    args = args.concat(configArgs) if configArgs? and _.size(configArgs) > 0
    args = args.concat([buffer.getPath()])
    cmd = atom.config.get('go-plus.gofmtPath')
    cmd = @dispatch.replaceTokensInPath(cmd, false)
    errored = false
    proc = spawn(cmd, args)
    proc.on 'error', (error) =>
      return unless error?
      errored = true
      console.log @name + ': error launching command [' + cmd + '] – ' + error  + ' – current PATH: [' + process.env.PATH + ']'
      errors = []
      error = line: false, column: false, type: 'error', msg: 'Gofmt Executable Not Found @ ' + cmd + ' ($GOPATH: ' + gopath + ')'
      errors.push error
      @emit @name + '-errors', editorView, errors
      @emit @name + '-complete', editorView, saving
    proc.stderr.on 'data', (data) => @mapErrors(editorView, data)
    proc.stdout.on 'data', (data) => console.log @name + ': ' + data if data?
    proc.on 'close', (code) =>
      console.log @name + ': [' + cmd + '] exited with code [' + code + ']' if code isnt 0
      @emit @name + '-complete', editorView, saving unless errored

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
          type: 'error'
        else
          line: matchLine[2]
          column: false
          msg: matchLine[5]
          type: 'error'
      errors.push error
    loop
      match = pattern.exec(data)
      extract(match)
      break unless match?
    @emit @name + '-errors', editorView, errors
