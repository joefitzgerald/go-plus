{spawn} = require('child_process')
{Subscriber, Emitter} = require('emissary')
_ = require('underscore-plus')
path = require('path')
RenameDialog = require('./rename-dialog')

module.exports =
class Gorename
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (dispatch) ->
    @dispatch = dispatch
    atom.commands.add 'atom-workspace',
      'golang:gorename': => @renameSymbolUnderCursor()
    @name = 'rename'

  destroy: ->
    @unsubscribe()
    @dispatch = null

  renameSymbolUnderCursor: ->
    editor = atom?.workspace?.getActiveTextEditor()
    return unless @dispatch.isValidEditor(editor)
    cursor = editor.getLastCursor()
    range = cursor.getCurrentWordBufferRange()
    dialog = new RenameDialog(editor.getTextInBufferRange(range))
    dialog.on 'name-accepted', (event, name) =>
      done = (err, messages) =>
        @dispatch.resetAndDisplayMessages(editor, messages)
      @doRename(name, editor, false, done)
      true
    dialog.attach()

  doRename: (name, editor, saving, callback = -> ) ->
    pos = editor.getCursorBufferPosition()
    offset = @positionToByte(editor, pos)
    buffer = editor?.getBuffer()
    cwd = path.dirname(buffer.getPath())
    go = @dispatch.goexecutable.current()
    gopath = go.buildgopath()
    args = ['-offset', buffer.getPath() + ':#' + offset]
    args = _.union(args, ['-to', name])
    if not gopath? or gopath is ''
      @emit(@name + '-complete', editor, saving)
      callback(null)
      return
    env = @dispatch.env()
    env['GOPATH'] = gopath
    cmd = go.gorename()
    if cmd is false
      message =
        line: false
        column: false
        msg: 'Rename Tool Missing'
        type: 'error'
        source: @name
      callback(null, [message])
      return

    # save any unmodified Go source files before invoking gorename
    editor.save() for editor in atom.workspace.getTextEditors() when editor.isModified() and editor.getTitle().slice(-3) is '.go'

    {code, stdout, stderr, messages} = @dispatch.executor.execSync(cmd, cwd, env, args)
    msg =
      line: false
      column: false
      msg: stderr.trim()
      source: @name
    msg.type = 'error' if code isnt 0
    messages = [msg]
    @emit(@name + '-complete', editor, saving)
    callback(null, messages)

  positionToByte: (editor, point) ->
    # TODO assumes single byte characters - fix later
    editor.buffer.characterIndexForPosition(point)
