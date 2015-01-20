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
  # (so far unable to get event-kit subscriptions to work)
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
    @gotoDefinitionForWord  @wordAtCursor(), done

  gotoDefinitionForWord: (word, callback = ->) ->
    # TODO remove temp
    console.log "Finding definition for word: *#{word}*"
    message = {}

    unless word.length > 0
      # TODO remove temp
      console.log "NOTHING TO DEFINE"
      message =
        line: false
        column: false
        msg: @warningNotFoundMessage
        type: 'warning'
        source: @name
      callback null, [message]
      return

    done = (exitcode, stdout, stderr, messages) =>
      # TODO remove temp
      console.log "Godef exitcode: #{exitcode}, reported: #{stdout}" # TODO remove temp
      if exitcode == 0
        outputs = stdout.split ":"
        # atom's cursors 0-based; godef uses diff-like 1-based
        line = parseInt(outputs[1],10) - 1
        col = parseInt(outputs[2],10) - 1
        targetFilePath = outputs[0]
        if targetFilePath == @editor.getPath()
          @editor.setCursorBufferPosition [col, line]
          @emit @didCompleteNotification, @editor, false
        else
          # TODO remove temp
          console.log "opening #{targetFilePath}"
          atom.workspace.open(targetFilePath, {initialLine:line, initialColumn:col}).then (e) =>
            @emit @didCompleteNotification, @editor, false
      else # godef can't find def
        # TODO remove temp
        console.log 'GODEF FOUND NO DEF'
        message =
          line: false
          column: false
          msg: "godef could not find definition for #{word}"
          type: 'warning'
          source: @name
      callback null, [message]

    cmd = 'godef'
    env = null
    filePath = @editor.getPath()
    cwd = path.dirname(filePath)
    args = ['-f', filePath, word]

    console.log "about to dispatch #{cmd}"
    @dispatch.executor.exec(cmd, cwd, env, done, args)

  wordAtCursor: ->
    options =
      wordRegex: /[\w+\.]*/
    return @editor.getWordUnderCursor(options)
