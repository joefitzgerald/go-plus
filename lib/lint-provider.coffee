_ = require('underscore-plus')

# Lint provider for Atom Linter.
module.exports =
  class Linter
    grammarScopes: ['source.go']
    scope: 'project'
    lintOnFly: false

    constructor: (@dispatch) ->
      return

    destroy: ->
      return

    lint: (editor) =>
      return Promise.resolve([]) unless @dispatch.isAtomLinterActive()
      @dispatch.applyGoTools(editor).then (messages) =>
        @linterFormatMessages(editor, messages)

    linterFormatMessages: (editor, msgs) ->
      msgs = msgs ? []

      upcaseFirst = (s) ->
        return if not s? or s.length is 0
        s.charAt(0).toUpperCase() + s.slice(1)

      lineRange = (editor, line) ->
        return [[line, 0], [line, 0]] unless editor?

        # Get the range of characters on the line, excluding leading indent:
        indentLevel = editor.indentationForBufferRow(line)
        startCol = Math.max(editor.getTabLength() * indentLevel - 1, 0)
        endCol = editor.getBuffer().lineLengthForRow(line)
        [[line, startCol], [line, endCol]]

      # Given a UTF-8 column offset on a line in a buffer, get the UTF-16
      # code unit offset. If no buffer is supplied, or the line is out of range,
      # returns the column value unmodified.
      lineUTF16Offset = (buffer, line, column) ->
        return column unless buffer?
        lineText = buffer.getLines()[line - 1]
        return column unless lineText?
        new Buffer(lineText).slice(0, column).toString().length

      # Get the character range for the message given an editor. If no editor
      # is supplied, falls back to returning whatever offset it was given.
      characterRange = (editor, msg) ->
        return [0, 0] unless msg.line
        if msg.column
          p = [msg.line - 1, lineUTF16Offset(editor?.getBuffer(), msg.line, msg.column)]
          [p, p]
        else
          lineRange(editor, msg.line - 1)

      getEditor = (file) ->
        if file is editor.getPath() then editor

      for msg in msgs
        file = msg.file ? editor.getURI()
        type: upcaseFirst(msg.type) ? 'Info'
        text: msg.msg
        filePath: file
        range: characterRange(getEditor(file), msg)
        goplusSource: msg.source
