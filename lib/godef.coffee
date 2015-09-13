{Point} = require('atom')
{Emitter, Subscriber} = require('emissary')
path = require('path')
fs = require('fs')

EditorLocationStack = require('./util/editor-location-stack')

module.exports =
class Godef
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (@dispatch) ->
    @godefCommand = "golang:godef"
    @returnCommand = "golang:godef-return"
    @name = 'def'
    @didCompleteNotification = "#{@name}-complete"
    @godefLocationStack = new EditorLocationStack()
    atom.commands.add 'atom-workspace', "golang:godef": => @gotoDefinitionForWordAtCursor()
    atom.commands.add 'atom-workspace', "golang:godef-return": => @godefReturn()
    @cursorOnChangeSubscription = null

  destroy: ->
    @unsubscribe()
    @dispatch = null

  reset: (editor) ->
    @emit('reset', @editor)
    @cursorOnChangeSubscription?.dispose()

  clearReturnHistory: ->
    @godefLocationStack.reset()

  # new pattern as per http://blog.atom.io/2014/09/16/new-event-subscription-api.html
  # (but so far unable to get event-kit subscriptions to work, so keeping emissary)
  onDidComplete: (callback) ->
    @on(@didCompleteNotification, callback)

  godefReturn: ->
    @godefLocationStack.restorePreviousLocation().then =>
      @emitDidComplete()

  gotoDefinitionForWordAtCursor: ->
    @editor = atom?.workspace?.getActiveTextEditor()
    done = (err, messages) =>
      @dispatch?.resetAndDisplayMessages(@editor, messages)

    unless @dispatch?.isValidEditor(@editor)
      @emitDidComplete()
      return
    if @editor.hasMultipleCursors()
      @bailWithWarning('Godef only works with a single cursor', done)
      return

    editorCursorUTF8Offset = (e) ->
      characterOffset = e.getBuffer().characterIndexForPosition(e.getCursorBufferPosition())
      text = e.getText().substring(0, characterOffset)
      Buffer.byteLength(text, "utf8")

    offset = editorCursorUTF8Offset(@editor)
    @reset(@editor)
    @gotoDefinitionWithParameters(['-o', offset, '-i'], @editor.getText(), done)

  gotoDefinitionForWord: (word, callback = -> undefined) ->
    @gotoDefinitionWithParameters([word], undefined, callback)

  gotoDefinitionWithParameters: (cmdArgs, cmdInput = undefined, callback = -> undefined) ->
    message = null
    done = (exitcode, stdout, stderr, messages) =>
      unless exitcode is 0
        # little point parsing the error further, given godef bugs eg
        # "godef: cannot parse expression: <arg>:1:1: expected operand, found 'return'"
        @bailWithWarning(stderr, callback)
        return
      @visitLocation(@parseGodefLocation(stdout), callback)

    go = @dispatch.goexecutable.current()
    cmd = go.godef()
    if cmd is false
      @bailWithError('Godef Tool Missing' , callback)
      return
    gopath = go.buildgopath()
    if not gopath? or gopath is ''
      @bailWithError('GOPATH is Missing' , callback)
      return
    env = @dispatch.env()
    env['GOPATH'] = gopath
    filePath = @editor.getPath()
    cwd = path.dirname(filePath)
    args = ['-f', filePath, cmdArgs...]
    @dispatch.executor.exec(cmd, cwd, env, done, args, cmdInput)

  parseGodefLocation: (godefStdout) ->
    outputs = godefStdout.trim().split(':')
    # Windows paths may have DriveLetter: prefix, or be UNC paths, so
    # handle both cases:
    [targetFilePathSegments..., rowNumber, colNumber] = outputs
    targetFilePath = targetFilePathSegments.join(':')

    # godef on an import returns the imported package directory with no
    # row and column information: handle this appropriately
    if targetFilePath.length is 0 and rowNumber
      targetFilePath = [rowNumber, colNumber].filter((x) -> x).join(':')
      rowNumber = colNumber = undefined

    # atom's cursors are 0-based; godef uses diff-like 1-based
    p = (rawPosition) -> parseInt(rawPosition, 10) - 1

    filepath: targetFilePath
    pos: if rowNumber? and colNumber? then new Point(p(rowNumber), p(colNumber))
    raw: godefStdout

  visitLocation: (loc, callback) ->
    unless loc.filepath
      @bailWithWarning("godef returned malformed output: #{JSON.stringify(loc.raw)}", callback)
      return

    fs.stat loc.filepath, (err, stats) =>
      if err
        @bailWithWarning("godef returned invalid file path: \"#{loc.filepath}\"", callback)
        return

      @godefLocationStack.pushCurrentLocation()
      if stats.isDirectory()
        @visitDirectory(loc, callback)
      else
        @visitFile(loc, callback)

  visitFile: (loc, callback) ->
    atom.workspace.open(loc.filepath).then (@editor) =>
      if loc.pos
        @editor.scrollToBufferPosition(loc.pos)
        @editor.setCursorBufferPosition(loc.pos)
        @cursorOnChangeSubscription = @highlightWordAtCursor(atom.workspace.getActiveTextEditor())
      @emitDidComplete()
      callback(null, [])

  visitDirectory: (loc, callback) ->
    success = (goFile) =>
      @visitFile({filepath: goFile, raw: loc.raw}, callback)
    failure = (err) =>
      @bailWithWarning("godef return invalid directory #{loc.filepath}: #{err}", callback)
    @findFirstGoFile(loc.filepath).then(success).catch(failure)

  findFirstGoFile: (dir) ->
    new Promise (resolve, reject) =>
      fs.readdir dir, (err, files) =>
        if err
          reject(err)
        goFilePath = @firstGoFilePath(dir, files.sort())
        if goFilePath
          resolve(goFilePath)
        else
          reject("#{dir} has no non-test .go file")

  firstGoFilePath: (dir, files) ->
    isGoSourceFile = (file) ->
      file.endsWith('.go') and file.indexOf('_test') is -1
    for file in files
      return path.join(dir, file) if isGoSourceFile(file)
    return

  emitDidComplete: ->
    @emit(@didCompleteNotification, @editor, false)

  bailWithWarning: (warning, callback) ->
    @bailWithMessage('warning', warning, callback)

  bailWithError: (error, callback) ->
    @bailWithMessage('error', error, callback)

  bailWithMessage: (type, msg, callback) ->
    message =
      line: false
      column: false
      msg: msg
      type: type
      source: @name
    callback(null, [message])
    @emitDidComplete()

  wordAtCursor: (editor = @editor) ->
    options =
      wordRegex: /[\w+\.]*/
    cursor = editor.getLastCursor()
    range = cursor.getCurrentWordBufferRange(options)
    word = @editor.getTextInBufferRange(range)
    return {word: word, range: range}

  highlightWordAtCursor: (editor = @editor) ->
    {word, range} = @wordAtCursor(editor)
    marker = editor.markBufferRange(range, {invalidate: 'inside'})
    decoration = editor.decorateMarker(marker, {type: 'highlight', class: 'definition'})
    cursor = editor.getLastCursor()
    cursor.onDidChangePosition -> marker.destroy()
