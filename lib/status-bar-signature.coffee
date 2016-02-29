require 'atom'

class StatusBarSignatureView extends HTMLElement
  activate: ->
    @changeTextContent('')
    return unless @getActiveTextEditor()?.getGrammar().name == 'Go'
    @displaySignature(@getActiveTextEditor().getLastCursor()) if @getActiveTextEditor()?
    @subscribeToActiveTextEditor()

  changeTextContent: (content) ->
    @textContent = content

  destroy: ->
    @activeItemSubscription?.dispose()
    @cursorSubscription?.dispose()

  displaySignature: (cursor) ->
    return unless cursor is @getActiveTextEditor().getLastCursor()
    editor = @getActiveTextEditor()
    line = cursor.getCurrentBufferLine()
    func = @extractFunc(line, cursor.getBufferPosition().column)

    if func == ''
      @changeTextContent('')
      return

    position =
      column: line.indexOf(func) + func.length
      row: cursor.getBufferPosition().row

    buffer = editor.getBuffer()
    return unless buffer?

    return unless cursor.getBufferPosition()
    index = buffer.characterIndexForPosition(position)
    text = editor.getText()

    offset = Buffer.byteLength(text.substring(0, index), "utf8")

    statusBar = this

    @provider.callGocode(editor.getPath(), offset, text)
      .then(
        (out) ->
          j = JSON.parse(out)
          if j.length
            tc = j[1][0].name + j[1][0].type.substring(4)
            statusBar.changeTextContent(tc)
          else
            statusBar.changeTextContent('')
        (reason) ->
          console.log reason
          statusBar.changeTextContent('')
      )

  extractFunc: (line, cursorPos) ->
    funcs = []

    matches = line.match(/([\w\.]+\()/g)

    return '' if matches == null
    return '' if matches.length == 0

    funcs.push {name: func.slice(0, -1), start: line.indexOf(func)} for func in matches.reverse() when line.indexOf('func ' + func) == -1
    return '' if funcs.length == 0
    return funcs[0].name if line.endsWith(funcs[0].name + '(')

    pos = 0
    for i in [0..line.length]
      if line[i] == ')' && funcs[pos]?
        funcs[pos].end = i + 1
        pos++

    for f in funcs
      return f.name if cursorPos >= f.start && cursorPos <= f.end

    return ''

  getActiveTextEditor: ->
    atom.workspace.getActiveTextEditor()

  init: ->
    @classList.add('inline-block')
    @activeItemSubscription = atom?.workspace?.onDidChangeActivePaneItem (activeItem) =>
      @activate()
    @activate()

  setProvider: (provider) ->
    @provider = provider

  subscribeToActiveTextEditor: ->
    @cursorSubscription?.dispose()
    @cursorSubscription = @getActiveTextEditor()?.onDidChangeCursorPosition ({cursor}) =>
      @displaySignature(cursor)

module.exports = document.registerElement('status-bar-go-plus-signature', prototype: StatusBarSignatureView.prototype, extends: 'div')
