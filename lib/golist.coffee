{SelectListView, $, $$} = require 'atom-space-pen-views'
{match} = require 'fuzzaldrin'
{spawnSync} = require('child_process')

module.exports =
class GoList extends SelectListView
  constructor: (dispatch) ->
    @dispatch = dispatch
    super
    @addClass('overlay from-top')

  destroy: ->
    @unsubscribe()
    @dispatch = null

  keyBindings: null

  getFilterKey: ->
    'displayName'

  cancelled: -> @hide()

  toggle: ->
    if @panel?.isVisible()
      @cancel()
    else
      @show()

  getpkgs: ()->
    go = @dispatch.goexecutable.current()
    if go?
      done = spawnSync(go.executable, ['list', '...'])
      result = done.stdout.toString()
      return result.split("\n")
    return []

  show: ->
    result = this.getpkgs()
    @panel ?= atom.workspace.addModalPanel(item: this)
    @panel.show()
    @storeFocusedElement()
    if @previouslyFocusedElement[0] and @previouslyFocusedElement[0] isnt document.body
      @eventElement = @previouslyFocusedElement[0]
    else
      @eventElement = atom.views.getView(atom.workspace)
    @keyBindings = atom.keymaps.findKeyBindings(target: @eventElement)
    keys = []
    for i in result
      keys.push {"name": i, "displayName": i}
    @setItems(keys)
    @focusFilterEditor()

  viewForItem: ({name, displayName, eventDescription}) ->
    keyBindings = @keyBindings
    # Style matched characters in search results
    filterQuery = @getFilterQuery()
    matches = match(displayName, filterQuery)

    $$ ->
      highlighter = (command, matches, offsetIndex) =>
        lastIndex = 0
        matchedChars = [] # Build up a set of matched chars to be more semantic

        for matchIndex in matches
          matchIndex -= offsetIndex
          continue if matchIndex < 0 # If marking up the basename, omit command matches
          unmatched = command.substring(lastIndex, matchIndex)
          if unmatched
            @span matchedChars.join(''), class: 'character-match' if matchedChars.length
            matchedChars = []
            @text unmatched
          matchedChars.push(command[matchIndex])
          lastIndex = matchIndex + 1

        @span matchedChars.join(''), class: 'character-match' if matchedChars.length

        # Remaining characters are plain text
        @text command.substring(lastIndex)

      @li class: 'event', 'data-event-name': name, =>
        @div class: 'pull-right', =>
          for binding in keyBindings when binding.command is name
            @kbd _.humanizeKeystroke(binding.keystrokes), class: 'key-binding'
        @span title: name, -> highlighter(displayName, matches, 0)

  hide: ->
    @panel?.hide()

  confirmed: ({name}) ->
    @cancel()
    editor = atom.workspace.getActiveTextEditor()
    pos = editor.getCursorBufferPosition()
    t = editor.getText()
    newLines = t.split(/\r\n|\r|\n/).length
    out = this.getImport(t, name)
    newLines = out.split(/\r\n|\r|\n/).length - newLines
    editor.setText(out)
    pos.row += newLines
    editor.setCursorBufferPosition(pos)

  getImport: (t, name) ->
    newl = this.getNewl(t)
    impReg = /import\s*(("[^"]+")|\(([^\)]+)\))/m
    impArrs = []
    impStr = "import (" + newl
    if impReg.test(t)
      matches = impReg.exec(t)
      m = matches[2]
      if not m?
        m = matches[3]

      m = m.replace(/(?:\r\n|\r|\n|;|\")+/g, " ")
      m = m.replace(/\s+/g, " ").trim()
      impArrs = m.split(" ")

    impArrs.push(name)
    for i in impArrs
      impStr = impStr + "\t\"" + i + "\"" + newl
    impStr = impStr + ")"

    packReg = /^\s*package .*/
    if impReg.test(t)
      t = t.replace(impReg, impStr)
    else if packReg.test(t)
      t = t.replace packReg, (p) ->
        return p + newl + newl + impStr

    return t

  getNewl: (str) ->
   elF = (el) ->
    return el == '\r\n'
   newlines = (str.match(/(?:\r?\n)/g) || [])
   crlf = newlines.filter(elF).length
   lf = newlines.length - crlf
   if crlf > lf
     return '\r\n'
   else
     return '\n'
