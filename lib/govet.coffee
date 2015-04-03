{spawn} = require('child_process')
{Subscriber, Emitter} = require('emissary')
_ = require('underscore-plus')
path = require('path')

module.exports =
class Govet
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (dispatch) ->
    @dispatch = dispatch
    atom.commands.add 'atom-workspace',
      'golang:govet': => @checkCurrentBuffer()
    @name = 'vet'

  destroy: ->
    @unsubscribe()
    @dispatch = null

  reset: (editor) ->
    @emit('reset', editor)

  checkCurrentBuffer: ->
    editor = atom?.workspace?.getActiveTextEditor()
    return unless @dispatch.isValidEditor(editor)
    @reset(editor)
    done = (err, messages) =>
      @dispatch.resetAndDisplayMessages(editor, messages)
    @checkBuffer(editor, false, done)

  checkBuffer: (editor, saving, callback = -> ) ->
    unless @dispatch.isValidEditor(editor)
      @emit(@name + '-complete', editor, saving)
      callback(null)
      return
    if saving and not atom.config.get('go-plus.vetOnSave')
      @emit(@name + '-complete', editor, saving)
      callback(null)
      return
    buffer = editor?.getBuffer()
    unless buffer?
      @emit(@name + '-complete', editor, saving)
      callback(null)
      return
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
    cwd = path.dirname(buffer.getPath())
    args = @dispatch.splicersplitter.splitAndSquashToArray(' ', atom.config.get('go-plus.vetArgs'))
    args = _.union(args, [buffer.getPath()])
    cmd = @dispatch.goexecutable.current().vet()
    if cmd is false
      message =
        line: false
        column: false
        msg: 'Vet Tool Missing'
        type: 'error'
        source: @name
      callback(null, [message])
      return
    done = (exitcode, stdout, stderr, messages) =>
      console.log(@name + ' - stdout: ' + stdout) if stdout? and stdout.trim() isnt ''
      messages = @mapMessages(stderr, cwd) if stderr? and stderr.trim() isnt ''
      @emit(@name + '-complete', editor, saving)
      callback(null, messages)
    @dispatch.executor.exec(cmd, cwd, env, done, args)

  mapMessages: (data, cwd) ->
    pattern = /^(.*?):(\d*?):((\d*?):)?\s(.*)$/img
    messages = []
    extract = (matchLine) ->
      return unless matchLine?
      file = if matchLine[1]? and matchLine[1] isnt '' then matchLine[1] else null
      message = switch
        when matchLine[4]?
          file: file
          line: matchLine[2]
          column: matchLine[4]
          msg: matchLine[5]
          type: 'warning'
          source: 'vet'
        else
          file: file
          line: matchLine[2]
          column: false
          msg: matchLine[5]
          type: 'warning'
          source: 'vet'
      messages.push(message)
    loop
      match = pattern.exec(data)
      extract(match)
      break unless match?
    return messages
