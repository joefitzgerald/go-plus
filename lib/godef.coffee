###
  TODO
  - fix 'error deactiviating go-plus'
 Questions

  - why function/method args sometimes, sometimes not, in brackets? (happily
    inconsistent, or is there a patter I'm not seeing?)
  -

 ###


{Emitter, Subscriber} = require 'emissary'

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
    @emit 'reset', editor

  gotoDefinitionForWordAtCursor: ->
    editor = atom?.workspace?.getActiveTextEditor()
    return unless @dispatch.isValidEditor editor
    @reset editor
    done = (err, messages) =>
      @dispatch.resetAndDisplayMessages editor, messages
    @gotoDefinitionForWord  @wordAtCursor(editor), done


  gotoDefinitionForWord: (word, callback = ->) ->
    console.log "Finding definition for word: #{word}"
    messages = {}
    if word.length > 0 then
      # invoke godef with word and capture output
      # if +'ve, capture filename, line, col
      # report this for goplus panel?
      # open and make new editor with filename
      # place cursor at line and column
      # report to dispatch / goplus for panel ??
      #atom.workspace.open('/tmp/txt')

    else
      message =
        line: false
        column: false
        msg: @warningNotFoundMessage
        type: 'warning'
        source: @name

    callback null, [message]



  wordAtCursor: (editor )->
    # options =
    #   wordRegex: /\w+\.\w+/
    return editor.getWordUnderCursor()
