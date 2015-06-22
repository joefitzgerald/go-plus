{spawn} = require('child_process')
{Subscriber, Emitter} = require('emissary')
_ = require('underscore-plus')
path = require('path')

module.exports =
class Gofmt
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (dispatch) ->
    atom.commands.add 'atom-workspace',
      'golang:gofmt': => @formatCurrentBuffer()
    @dispatch = dispatch
    @name = 'fmt'

  destroy: ->
    @unsubscribe()
    @dispatch = null

  reset: (editor) ->
    @emit('reset', editor)

  formatCurrentBuffer: ->
    editor = atom?.workspace?.getActiveTextEditor()
    return unless @dispatch.isValidEditor(editor)
    @reset(editor)
    done = (err, messages) =>
      @dispatch.resetAndDisplayMessages(editor, messages)
    @formatBuffer(editor, false, done)

  formatBuffer: (editor, saving, callback = -> ) ->
    unless @dispatch.isValidEditor(editor)
      @emit(@name + '-complete', editor, saving)
      callback(null)
      return
    if saving and not atom.config.get('go-plus.formatOnSave')
      @emit(@name + '-complete', editor, saving)
      callback(null)
      return
    buffer = editor?.getBuffer()
    unless buffer?
      @emit(@name + '-complete', editor, saving)
      callback(null)
      return
    cwd = path.dirname(buffer.getPath())
    args = ['-w']
    configArgs = @dispatch.splicersplitter.splitAndSquashToArray(' ', atom.config.get('go-plus.formatArgs'))
    args = _.union(args, configArgs) if configArgs? and _.size(configArgs) > 0
    args = _.union(args, [buffer.getPath()])
    go = @dispatch.goexecutable.current()
    unless go?
      callback(null)
      @dispatch.displayGoInfo(false)
      return
    gopath = go.buildgopath()
    if not gopath? or gopath is ''
      @emit(@name + '-complete', editor, saving)
      callback(null)
      return
    env = @dispatch.env()
    env['GOPATH'] = gopath
    cmd = go.format()
    if cmd is false
      message =
        line: false
        column: false
        msg: 'Format Tool Missing'
        type: 'error'
        source: @name
      callback(null, [message])
      return

    {stdout, stderr, messages} = @dispatch.executor.execSync(cmd, cwd, env, args)

    console.log(@name + ' - stdout: ' + stdout) if stdout? and stdout.trim() isnt ''
    messages = @mapMessages(stderr, cwd) if stderr? and stderr.trim() isnt ''
    @emit(@name + '-complete', editor, saving)
    callback(null, messages)

  mapMessages: (data, cwd) =>
    pattern = /^(.*?):(\d*?):((\d*?):)?\s(.*)$/img
    messages = []
    return messages unless data? and data isnt ''
    extract = (matchLine) =>
      return unless matchLine?
      file = if matchLine[1]? and matchLine[1] isnt '' then matchLine[1] else null
      message = switch
        when matchLine[4]?
          file: file
          line: matchLine[2]
          column: matchLine[4]
          msg: matchLine[5]
          type: 'error'
          source: @name
        else
          file: file
          line: matchLine[2]
          column: false
          msg: matchLine[5]
          type: 'error'
          source: @name
      messages.push(message)
    loop
      match = pattern.exec(data)
      extract(match)
      break unless match?
    return messages
