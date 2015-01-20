{Emitter, Subscriber} = require 'emissary'
# should use event-kit as per http://blog.atom.io/2014/09/16/new-event-subscription-api.html
# (so far unable to get subscriptions to work)
path = require 'path'

module.exports =
class Godef
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (dispatch) ->
    @commandName = "golang:godef"
    @dispatch = dispatch
    @name = 'def'
    @warningNotFoundMessage = 'No word under cursor to define'
    atom.commands.add 'atom-workspace',
      'golang:godef': => @gotoDefinitionForWordAtCursor()
    @emitter = new Emitter

  destroy: ->
    @unsubscribe()
    @dispatch = null

  reset: (editor) ->
    @emit 'reset', @editor

  gotoDefinitionForWordAtCursor: ->
    @editor = atom?.workspace?.getActiveTextEditor()
    return unless @dispatch.isValidEditor @editor
    @reset @editor
    done = (err, messages) =>
      @dispatch.resetAndDisplayMessages @editor, messages
    @gotoDefinitionForWord  @wordAtCursor(), done

  gotoDefinitionForWord: (word, callback = ->) ->

    # TODO remove temp
    console.log "Finding definition for word: *#{word}*"
    message = []
    if word.length > 0
      # TODO follow go-plus pattern for cmd invocation
      command = 'godef'
      env = null
      filename = @editor.getPath()
      cwd = path.dirname(filename)
      args = ['-f', filename, word]
      done = (exitcode, stdout, stderr, messages) =>
        console.log "#{command} exitcode: #{exitcode}, reported: #{stdout}" # TODO remove temp
        if exitcode == 0
          outputs = stdout.split ":"
          # atom's cursors 0-based; godef uses diff 1-based
          wordPoint = [parseInt(outputs[1],10) - 1,parseInt(outputs[2],10) - 1]
          @editor.setCursorBufferPosition wordPoint
          @emit "#{@name}-complete", @editor, false
        else
          # TODO report failures  as per else clause below (not an id; not found)
          # TODO remove temp
          console.log 'no bloody good'

      @dispatch.executor.exec(command, cwd, env, done, args)
      # if +'ve, capture filename, line, col
      # report this for goplus panel?
      # open and make new editor with filename
      # place cursor at line and column
      # report to dispatch / goplus for panel ??
    else # no word found
      console.log "NOTHING TO DEFINE"
      message =
        line: false
        column: false
        msg: @warningNotFoundMessage
        type: 'warning'
        source: @name

    callback null, [message]

  wordAtCursor: ->
    options =
      wordRegex: /[\w+\.]*/
    return @editor.getWordUnderCursor(options)
