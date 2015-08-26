path = require('path')
fs = require('fs-plus')
temp = require('temp').track()
_ = require ("underscore-plus")
{Subscriber} = require 'emissary'
{Point} = require 'atom'

describe "godef", ->
  [mainModule, editor, editorView, dispatch, filePath, workspaceElement] = []
  testDisposables = []
  testText = """package main
                import "fmt"
                var testvar = "stringy"

                func f(){
                  localVar := " says 世界中の世界中の!"
                  fmt.Println( testvar + localVar )}
             """

  beforeEach ->
    # don't run any of the on-save tools
    atom.config.set("go-plus.formatOnSave", false)
    atom.config.set("go-plus.lintOnSave", false)
    atom.config.set("go-plus.vetOnSave", false)
    atom.config.set("go-plus.syntaxCheckOnSave", false)
    atom.config.set("go-plus.runCoverageOnSave", false)

    directory = temp.mkdirSync()
    atom.project.setPaths(directory)
    filePath = path.join(directory, 'go-plus-testing.go')
    fs.writeFileSync(filePath, '')
    workspaceElement = atom.views.getView(atom.workspace)
    jasmine.attachToDOM(workspaceElement)
    jasmine.unspy(window, 'setTimeout')

    waitsForPromise -> atom.workspace.open(filePath).then (e) ->
      editor = e
      editorView = atom.views.getView(editor)

    waitsForPromise ->
      atom.packages.activatePackage('language-go')

    waitsForPromise -> atom.packages.activatePackage('go-plus').then (g) ->
      mainModule = g.mainModule

    waitsFor ->
      mainModule.dispatch?.ready

    runs ->
      dispatch = mainModule.dispatch

  triggerCommand = (command) ->
    atom.commands.dispatch(workspaceElement, dispatch.godef[command])

  godefDone = ->
    new Promise (resolve, reject) ->
      testDisposables.push(dispatch.godef.onDidComplete(resolve))
      return

  bufferTextOffset = (text, count = 1, delta = 0) ->
    buffer = editor.getText()
    index = -1
    for i in [1..count]
      index = buffer.indexOf(text, (if index is -1 then 0 else index + text.length))
      break if index is -1
    return index if index is -1
    index + delta

  offsetCursorPos = (offset) ->
    return if offset < 0
    editor.getBuffer().positionForCharacterIndex(offset)

  bufferTextPos = (text, count = 1, delta = 0) ->
    offsetCursorPos(bufferTextOffset(text, count, delta))

  cursorToOffset = (offset) ->
    return if offset is -1
    editor.setCursorBufferPosition(offsetCursorPos(offset))
    return

  cursorToText = (text, count = 1, delta = 0) ->
    cursorToOffset(bufferTextOffset(text, count, delta))

  afterEach ->
    disposable.dispose() for disposable in testDisposables
    testDisposables = []

  waitsForCommand = (command) ->
    godefPromise = undefined
    runs ->
      # Create the promise before triggering the command because triggerCommand
      # may call onDidComplete synchronously.
      godefPromise = godefDone()
      triggerCommand(command)
    waitsForPromise -> godefPromise
    return

  waitsForGodef = ->
    waitsForCommand 'godefCommand'

  waitsForGodefReturn = ->
    waitsForCommand 'returnCommand'

  waitsForDispatchComplete = (action) ->
    dispatchComplete = false
    runs ->
      dispatch.once 'dispatch-complete', -> dispatchComplete = true
    runs action
    waitsFor -> dispatchComplete

  describe "wordAtCursor (| represents cursor pos)", ->
    godef = null
    beforeEach ->
      godef = dispatch.godef
      godef.editor = editor
      editor.setText("foo foo.bar bar")

    it "should return foo for |foo", ->
      editor.setCursorBufferPosition([0, 0])
      {word, range} = godef.wordAtCursor()
      expect(word).toEqual('foo')
      expect(range).toEqual([[0, 0], [0, 3]])

    it "should return foo for fo|o", ->
      editor.setCursorBufferPosition([0, 2])
      {word, range} = godef.wordAtCursor()
      expect(word).toEqual('foo')
      expect(range).toEqual([[0, 0], [0, 3]])

    # TODO: Check with https://github.com/crispinb - this test used to fail and
    # it is possible the semantics of cursor.getCurrentWordBufferRange have
    # changed
    it "should return no word for foo| foo", ->
      editor.setCursorBufferPosition([0, 3])
      {word, range} = godef.wordAtCursor()
      expect(word).toEqual('foo')
      expect(range).toEqual([[0, 0], [0, 3]])

    it "should return bar for |bar", ->
      editor.setCursorBufferPosition([0, 12])
      {word, range} = godef.wordAtCursor()
      expect(word).toEqual('bar')
      expect(range).toEqual([[0, 12], [0, 15]])

    it "should return foo.bar for !foo.bar", ->
      editor.setCursorBufferPosition([0, 4])
      {word, range} = godef.wordAtCursor()
      expect(word).toEqual('foo.bar')
      expect(range).toEqual([[0, 4], [0, 11]])

    it "should return foo.bar for foo.ba|r", ->
      editor.setCursorBufferPosition([0, 10])
      {word, range} = godef.wordAtCursor()
      expect(word).toEqual('foo.bar')
      expect(range).toEqual([[0, 4], [0, 11]])

  describe "when go-plus is loaded", ->
    it "should have registered the golang:godef command",  ->
      currentCommands = atom.commands.findCommands({target: editorView})
      godefCommand = (cmd for cmd in currentCommands when cmd.name is dispatch.godef.godefCommand)
      expect(godefCommand.length).toEqual(1)

  describe "when godef command is invoked", ->
    describe "if there is more than one cursor", ->
      it "displays a warning message", ->
        waitsForDispatchComplete ->
          editor.setText testText
          editor.save()
        runs ->
          editor.setCursorBufferPosition([0, 0])
          editor.addCursorAtBufferPosition([1, 0])

        waitsForGodef()

        runs ->
          expect(dispatch.messages?).toBe(true)
          expect(_.size(dispatch.messages)).toBe 1
          expect(dispatch.messages[0].type).toBe("warning")

    describe "with no word under the cursor", ->
      it "displays a warning message", ->
        editor.setCursorBufferPosition([0, 0])
        waitsForGodef()
        runs ->
          expect(dispatch.messages?).toBe(true)
          expect(_.size(dispatch.messages)).toBe 1
          expect(dispatch.messages[0].type).toBe("warning")

    describe "with a word under the cursor", ->
      beforeEach ->
        waitsForDispatchComplete ->
          editor.setText testText
          editor.save()

      describe "defined within the current file", ->
        beforeEach ->
          cursorToText("testvar", 2)
          waitsForGodef()

        it "should move the cursor to the definition", ->
          runs ->
            expect(editor.getCursorBufferPosition()).toEqual(bufferTextPos("testvar", 1))

        it "should create a highlight decoration of the correct class", ->
          runs ->
            higlightClass = 'definition'
            goPlusHighlightDecs = (d for d in editor.getHighlightDecorations() when d.getProperties()['class'] is higlightClass)
            expect(goPlusHighlightDecs.length).toBe(1)

      describe "defined outside the current file", ->
        it "should open a new text editor", ->
          runs ->
            # Go to the Println in fmt.Println:
            cursorToText("fmt.Println", 1, "fmt.".length)
          waitsForGodef()
          runs ->
            currentEditor = atom.workspace.getActiveTextEditor()
            expect(currentEditor.getTitle()).toBe('print.go')

      describe "defined as a local variable", ->
        it "should jump to the local var definition", ->
          runs ->
            cursorToText("localVar", 2)
          waitsForGodef()
          runs ->
            expect(editor.getCursorBufferPosition()).toEqual(bufferTextPos("localVar", 1))

      describe "defined as a local import prefix", ->
        it "should jump to the import", ->
          runs -> cursorToText("fmt.Println")
          waitsForGodef()
          runs ->
            expect(editor.getCursorBufferPosition()).toEqual(bufferTextPos("\"fmt\""))

      describe "an import statement", ->
        it "should open the first (lexicographical) .go file in the imported package", ->
          runs -> cursorToText("\"fmt\"")
          waitsForGodef()
          runs ->
            activeEditor = atom.workspace.getActiveTextEditor()
            file = activeEditor.getURI()
            expect(path.basename(file)).toEqual("doc.go")
            expect(path.basename(path.dirname(file))).toEqual("fmt")

  describe "when godef-return command is invoked", ->
    beforeEach ->
      waitsForDispatchComplete ->
        editor.setText testText
        editor.save()

    it "will return across files to the location where godef was invoked", ->
      runs -> cursorToText("fmt.Println", 1, "fmt.".length)
      waitsForGodef()
      runs ->
        activeEditor = atom.workspace.getActiveTextEditor()
        expect(path.basename(activeEditor.getURI())).toEqual("print.go")
      waitsForGodefReturn()
      runs ->
        expect(atom.workspace.getActiveTextEditor()).toBe(editor)
        expect(editor.getCursorBufferPosition()).toEqual(bufferTextPos("fmt.Println", 1, "fmt.".length))

    it "will return within the same file to the location where godef was invoked", ->
      runs -> cursorToText("localVar", 2)
      waitsForGodef()
      runs ->
        expect(editor.getCursorBufferPosition()).toEqual(bufferTextPos("localVar", 1))
      waitsForGodefReturn()
      runs ->
        expect(editor.getCursorBufferPosition()).toEqual(bufferTextPos("localVar", 2))

    it 'will do nothing if the return stack is empty', ->
      runs ->
        dispatch.godef.clearReturnHistory()
        cursorToText("localVar", 2)
      waitsForGodefReturn()
      runs ->
        expect(editor.getCursorBufferPosition()).toEqual(bufferTextPos("localVar", 2))
