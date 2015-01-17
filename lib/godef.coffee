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
    @warningNotFoundMessage = 'No word under cursor to define'
    atom.commands.add 'atom-workspace',
      'golang:godef': => @gotoDefinitionForWordAtCursor()

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

    console.log "Finding definition for word: #{word}\n in buffer: #{@editor.getText()}"

    messages = {}
    if word.length > 0
      @emit 'testingdone'
      # TODO follow go-plus pattern for cmd invocation
      command = 'godef'
      env = null
      filename = @editor.getPath()
      cwd = path.dirname(filename)
      args = ['-f', filename, word]
      done = (exitcode, stdout, stderr, messages) =>
        console.log "#{command} exitcode: #{exitcode}, it reported: #{stdout}"
        if exitcode == 0
          output = stdout.split ":"
          wordPosition = [parseInt(output[1],10) - 1,parseInt(output[2],10) - 1]
          @editor.setCursorBufferPosition wordPosition
        else
          # TODO report failures  as per else clause below (not an id; not found)
          console.log 'no bloody good'

      @dispatch.executor.exec(command, cwd, env, done, args)
      # if +'ve, capture filename, line, col
      # report this for goplus panel?
      # open and make new editor with filename
      # place cursor at line and column
      # report to dispatch / goplus for panel ??
    else
      message =
        line: false
        column: false
        msg: @warningNotFoundMessage
        type: 'warning'
        source: @name

    callback null, [message]

  wordAtCursor: ->
    # options =
    #   wordRegex: /\w+\.\w+/
    return @editor.getWordUnderCursor()
