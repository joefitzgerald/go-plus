{Emitter, Subscriber} = require 'emissary'
path = require 'path'

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
    atom.commands.add 'atom-workspace',
      'golang:godef': => @gotoDefinitionForWordAtCursor()
    @emitter = new Emitter

  destroy: ->
    @unsubscribe()
    @dispatch = null

  reset: (editor) ->
    @emit 'reset', @editor

  # new pattern as per http://blog.atom.io/2014/09/16/new-event-subscription-api.html
  # (but so far unable to get event-kit subscriptions to work)
  onDidComplete: (callback) ->
    @on @didCompleteNotification, callback

  gotoDefinitionForWordAtCursor: ->
    @editor = atom?.workspace?.getActiveTextEditor()
    unless @dispatch.isValidEditor @editor
      @emit @didCompleteNotification, @editor, false
      return
    @reset @editor
    done = (err, messages) =>
      @dispatch.resetAndDisplayMessages @editor, messages
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
        # atom's cursors 0-based; godef uses diff-like 1-based
        line = parseInt(outputs[1],10) - 1
        col = parseInt(outputs[2],10) - 1

        console.log "line: #{line}, col: #{col}"

        targetFilePath = outputs[0]
        if targetFilePath == @editor.getPath()
          @editor.setCursorBufferPosition [col, line]
          @highlightWordAtCursor()
          @emit @didCompleteNotification, @editor, false
        else
          atom.workspace.open(targetFilePath, {initialLine:line, initialColumn:col}).then (e) =>
            @highlightWordAtCursor(atom.workspace.getActiveEditor())
            @emit @didCompleteNotification, @editor, false
      else # godef can't find def
        message =
          line: false
          column: false
          msg: "godef could not find definition for #{word}"
          type: 'warning'
          source: @name
      callback null, [message]

    cmd = 'godef'
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
    # TODO how
    subscription = cursor.onDidChangePosition ->
      highlightMarker.destroy()
