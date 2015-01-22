{Emitter, Subscriber} = require 'emissary'
path = require 'path'
fs = require 'fs'

module.exports =
class Godef
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (dispatch) ->
    @commandName = "golang:godef"
    @dispatch = dispatch
    @name = 'def'
    @didCompleteNotification = "#{@name}-complete"
    @warningNotFoundMessage = "No word under cursor to define"
    @warningMultipleCursorsMessage = "Godef only works with a single cursor"
    atom.commands.add 'atom-workspace',
      'golang:godef': => @gotoDefinitionForWordAtCursor()
    @cursorOnChangeSubscription = null

  destroy: ->
    @unsubscribe()
    @dispatch = null

  reset: (editor) ->
    @emit 'reset', @editor
    @cursorOnChangeSubscription?.dispose()

  # new pattern as per http://blog.atom.io/2014/09/16/new-event-subscription-api.html
  # (but so far unable to get event-kit subscriptions to work)
  onDidComplete: (callback) =>
    @on @didCompleteNotification, callback

  gotoDefinitionForWordAtCursor: ->
    @editor = atom?.workspace?.getActiveTextEditor()
    done = (err, messages) =>
      @dispatch.resetAndDisplayMessages @editor, messages
    unless @dispatch.isValidEditor @editor
      @emit @didCompleteNotification, @editor, false
      return
    if @editor.hasMultipleCursors()
      message =
        line: false
        column: false
        msg: @warningMultipleCursorsMessage
        type: 'warning'
        source: @name
      done null, [message]
      return
    @reset @editor
    {word, range} = @wordAtCursor()
    @gotoDefinitionForWord word, done

  gotoDefinitionForWord: (word, callback = ->) ->
    message = null

    unless word.length > 0
      message =
        line: false
        column: false
        msg: @warningNotFoundMessage
        type: 'warning'
        source: @name
      callback null, [message]
      return

    done = (exitcode, stdout, stderr, messages) =>
      if exitcode == 0
        outputs = stdout.split ":"
        targetFilePath = outputs[0]
        unless fs.existsSync(targetFilePath)
          message =
            line: false
            column: false
            msg: "godef suggested a file path (\"#{targetFilePath}\") that does not exist)"
            type: 'warning'
            source: @name
          callback null, [message]
          return
        # atom's cursors 0-based; godef uses diff-like 1-based
        row = parseInt(outputs[1],10) - 1
        col = parseInt(outputs[2],10) - 1
        if targetFilePath == @editor.getPath()
          @editor.setCursorBufferPosition [row, col]
          @cursorOnChangeSubscription = @highlightWordAtCursor()
          @emit @didCompleteNotification, @editor, false
          callback null, [message]
        else
          atom.workspace.open(targetFilePath, {initialLine:row, initialColumn:col}).then (e) =>
            @cursorOnChangeSubscription = @highlightWordAtCursor(atom.workspace.getActiveEditor())
            @emit @didCompleteNotification, @editor, false
            callback null, [message]
      else # godef can't find def
        # little point parsing the error further, given godef bugs eg
        # "godef: cannot parse expression: <arg>:1:1: expected operand, found 'return'"
        message =
          line: false
          column: false
          msg: stderr
          type: 'warning'
          source: @name
        callback null, [message]

    go = @dispatch.goexecutable.current()
    cmd = go.godef()
    if cmd is false
      message =
        line: false
        column: false
        msg: 'Godef Tool Missing'
        type: 'error'
        source: @name
      callback(null, [message])
      return
    env = @dispatch.env()
    filePath = @editor.getPath()
    cwd = path.dirname(filePath)
    args = ['-f', filePath, word]

    @dispatch.executor.exec(cmd, cwd, env, done, args)

  wordAtCursor: (editor = @editor) ->
    options =
      wordRegex: /[\w+\.]*/
    cursor = editor.getCursor()
    # TODO this is probably a furphy. It's the range of godef's output that's needed
    range = cursor.getCurrentWordBufferRange(options)
    word = @editor.getTextInBufferRange(range)
    return {word: word, range: range}

  highlightWordAtCursor: (editor = @editor) ->
    {word, range} = @wordAtCursor(editor)
    highlightMarker = editor.markBufferRange(range, {invalidate:'inside'})
    highlightDecoration = editor.decorateMarker(highlightMarker, {type:'highlight', class:'goplus-godef-highlight'})
    cursor = editor.getCursor()
    cursor.onDidChangePosition ->  highlightMarker.destroy()
