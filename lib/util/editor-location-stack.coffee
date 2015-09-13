doneAlready = ->
  new Promise (resolve, reject) ->
    resolve()

module.exports =
  class EditorLocationStack
    constructor: (@maxSize = 500) ->
      @maxSize = 1 if @maxSize < 1
      @stack = []

    isEmpty: ->
      not @stack.length

    reset: ->
      @stack = []

    pushCurrentLocation: ->
      editor = atom.workspace.getActiveTextEditor()
      return unless editor
      loc =
        position: editor.getCursorBufferPosition()
        file: editor.getURI()
      return unless loc.file and loc.position?.row and loc.position?.column
      @push(loc)
      return

    ##
    # Returns a promise that is complete when navigation is done.
    restorePreviousLocation: ->
      return doneAlready() if @isEmpty()
      lastLocation = @stack.pop()
      atom.workspace.open(lastLocation.file).then (editor) =>
        @moveEditorCursorTo(editor, lastLocation.position)

    moveEditorCursorTo: (editor, pos) ->
      return unless editor
      editor.scrollToBufferPosition(pos)
      editor.setCursorBufferPosition(pos)
      return

    push: (loc) ->
      @stack.push(loc)
      @stack.splice(0, @stack.length - @maxSize) if @stack.length > @maxSize
      return
