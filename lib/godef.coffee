{Emitter, Subscriber} = require('emissary')
path = require('path')
fs = require('fs')

module.exports =
class Godef
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (dispatch) ->
    @commandName = "golang:godef"
    @dispatch = dispatch
    @name = 'def'
    @didCompleteNotification = "#{@name}-complete"
    atom.commands.add 'atom-workspace',
      'golang:godef': => @gotoDefinitionForWordAtCursor()
    @cursorOnChangeSubscription = null

  destroy: ->
    @unsubscribe()
    @dispatch = null

  reset: (editor) ->
    @emit('reset', @editor)
    @cursorOnChangeSubscription?.dispose()

  # new pattern as per http://blog.atom.io/2014/09/16/new-event-subscription-api.html
  # (but so far unable to get event-kit subscriptions to work, so keeping emissary)
  onDidComplete: (callback) =>
    @on(@didCompleteNotification, callback)

  gotoDefinitionForWordAtCursor: ->
    @editor = atom?.workspace?.getActiveTextEditor()
    done = (err, messages) =>
      @dispatch.resetAndDisplayMessages(@editor, messages)

    unless @dispatch.isValidEditor(@editor)
      @emit(@didCompleteNotification, @editor, false)
      return
    if @editor.hasMultipleCursors()
      @bailWithWarning('Godef only works with a single cursor', done)
      return
    {word, range} = @wordAtCursor()
    unless word.length > 0
      @bailWithWarning('No word under cursor to define', done)
      return

    @reset(@editor)
    @gotoDefinitionForWord(word, done)

  gotoDefinitionForWord: (word, callback = -> undefined) ->
    message = null
    done = (exitcode, stdout, stderr, messages) =>
      unless exitcode is 0
        # little point parsing the error further, given godef bugs eg
        # "godef: cannot parse expression: <arg>:1:1: expected operand, found 'return'"
        @bailWithWarning(stderr, callback)
        return
      outputs = stdout.split(':')
      if process.platform is 'win32'
        targetFilePath = "#{outputs[0]}:#{outputs[1]}"
        rowNumber = outputs[2]
        colNumber = outputs[3]
      else
        targetFilePath = outputs[0]
        rowNumber = outputs[1]
        colNumber = outputs[2]

      unless fs.existsSync(targetFilePath)
        @bailWithWarning("godef suggested a file path (\"#{targetFilePath}\") that does not exist)", callback)
        return
      # atom's cursors 0-based; godef uses diff-like 1-based
      row = parseInt(rowNumber, 10) - 1
      col = parseInt(colNumber, 10) - 1
      if @editor.getPath() is targetFilePath
        @editor.setCursorBufferPosition [row, col]
        @cursorOnChangeSubscription = @highlightWordAtCursor()
        @emit(@didCompleteNotification, @editor, false)
        callback(null, [message])
      else
        atom.workspace.open(targetFilePath, {initialLine: row, initialColumn: col}).then (e) =>
          @cursorOnChangeSubscription = @highlightWordAtCursor(atom.workspace.getActiveTextEditor())
          @emit(@didCompleteNotification, @editor, false)
          callback(null, [message])

    go = @dispatch.goexecutable.current()
    cmd = go.godef()
    if cmd is false
      @bailWithError('Godef Tool Missing' , callback)
      return
    gopath = go.buildgopath()
    if not gopath? or gopath is ''
      @bailWithError('GOPATH is Missing' , callback)
      return
    env = @dispatch.env()
    env['GOPATH'] = gopath
    filePath = @editor.getPath()
    cwd = path.dirname(filePath)
    args = ['-f', filePath, word]

    @dispatch.executor.exec(cmd, cwd, env, done, args)

  bailWithWarning: (warning, callback) ->
    @bailWithMessage('warning', warning, callback)

  bailWithError: (error, callback) ->
    @bailWithMessage('error', error, callback)

  bailWithMessage: (type, msg, callback) ->
    message =
      line: false
      column: false
      msg: msg
      type: type
      source: @name
    callback(null, [message])

  wordAtCursor: (editor = @editor) ->
    options =
      wordRegex: /[\w+\.]*/
    cursor = editor.getLastCursor()
    range = cursor.getCurrentWordBufferRange(options)
    word = @editor.getTextInBufferRange(range)
    return {word: word, range: range}

  highlightWordAtCursor: (editor = @editor) ->
    {word, range} = @wordAtCursor(editor)
    marker = editor.markBufferRange(range, {invalidate: 'inside'})
    decoration = editor.decorateMarker(marker, {type: 'highlight', class: 'definition'})
    cursor = editor.getLastCursor()
    cursor.onDidChangePosition -> marker.destroy()
