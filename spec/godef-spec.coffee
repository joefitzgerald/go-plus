###
  TODO - Essential
  * bug: never dispose() cursor subscriptions in godef.coffee
  - bug: "Uncaught TypeError: Cannot read property 'add' of null",
  - how to test for dispatch of a command?
  - deal with multiple cursors
  - check for paths of exe and source files on Windows?
  - thorough playing to destruction with lots of go files
    (use on a couple of days' Go programming)

  TODO - Enhancements
  - copy test text from test file instead of using string lits?
  - scroll target to put the def line at top of ed pane when it's in a different file?
  - should I use mapMessages approach? I'm forking based on exitcode.
  - consider -webkit-animation: to animate the definition highlight?

 Questions for package maintainer

  - why function/method args sometimes, sometimes not, in brackets? (happily
    inconsistent, or is there a patter I'm not seeing?)
  - gofmt has a buffer existence check: `buffer = editor?.getBuffer()`
    Under what circumstances would a valid (*.go) active text editor not have a
    buffer?


    A good reason to keep consistent: f() looks a lot like f () ->

 ###

path = require 'path'
fs = require 'fs-plus'
temp = require('temp').track()
_ = require ("underscore-plus")
{Subscriber} = require 'emissary'

fdescribe "godef", ->
  [editor, editorView, dispatch, filePath, workspaceElement] = []
  testText = "package main\n import \"fmt\"\n var testvar = \"stringy\"\n\nfunc f(){fmt.Println( testvar )}\n\n"

  beforeEach ->
    directory = temp.mkdirSync()
    atom.project.setPaths(directory)
    filePath = path.join(directory, 'go-plus-testing.go')
    fs.writeFileSync(filePath, '')
    workspaceElement = atom.views.getView(atom.workspace)
    jasmine.attachToDOM(workspaceElement)

    waitsForPromise -> atom.workspace.open(filePath).then (e) ->
      editor = e
      editorView = atom.views.getView(editor)

    waitsForPromise ->
      atom.packages.activatePackage('language-go')

    waitsForPromise ->
      atom.packages.activatePackage('go-plus')

    runs ->
      dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
      dispatch.goexecutable.detect()

    waitsFor ->
      dispatch.ready is true

  describe "wordAtCursor (| represents cursor pos)", ->
    godef = null
    beforeEach ->
      godef = dispatch.godef
      godef.editor = editor
      editor.setText("foo foo.bar bar")

    fit "should return foo for |foo", ->
      editor.setCursorBufferPosition([0,0])
      {word, range} = godef.wordAtCursor()
      expect(word).toEqual('foo')
      expect(range).toEqual([[0,0], [0,3]])

    it "should return foo for fo|o", ->
      editor.setCursorBufferPosition([0,2])
      {word, range} = godef.wordAtCursor()
      expect(word).toEqual('foo')
      expect(range).toEqual([[0,0], [0,3]])

    # odd that word range includes the trailing space, but cursor there
    # isn't 'in' the word, but that's how Atom does it
    it "should return no word for foo| foo", ->
      editor.setCursorBufferPosition([0,3])
      {word, range} = godef.wordAtCursor()
      expect(word).toEqual('')
      expect(range).toEqual([[0,3], [0,3]])

    it "should return bar for |bar", ->
      editor.setCursorBufferPosition([0,12])
      {word, range} = godef.wordAtCursor()
      expect(word).toEqual('bar')
      expect(range).toEqual([[0,12], [0,15]])

    it "should return foo.bar for !foo.bar", ->
      editor.setCursorBufferPosition([0,4])
      {word, range} = godef.wordAtCursor()
      expect(word).toEqual('foo.bar')
      expect(range).toEqual([[0,4], [0,11]])

    fit "should return foo.bar for foo.ba|r", ->
      editor.setCursorBufferPosition([0,10])
      {word, range} = godef.wordAtCursor()
      expect(word).toEqual('foo.bar')
      expect(range).toEqual([[0,4], [0,11]])

  describe "when go-plus is loaded", ->
    it "should have registered the golang:godef command",  ->
      currentCommands = atom.commands.findCommands({target: editorView})
      godefCommand = (cmd for cmd in currentCommands when cmd.name is dispatch.godef.commandName)
      expect(godefCommand.length).toEqual(1)

  describe "when godef command is invoked", ->
      describe "with no word under the cursor", ->
        beforeEach ->
          editor.setText ""
          editor.save()

        waitsFor ->
          editor.isModified() is false

        it "displays a warning message", ->
          editor.setCursorBufferPosition([0,0])
          atom.commands.dispatch(workspaceElement, dispatch.godef.commandName)
          expect(dispatch.messages?).toBe(true)
          expect(_.size(dispatch.messages)).toBe 1
          expect(dispatch.messages[0].msg).toBe(dispatch.godef.warningNotFoundMessage)

        # TODO implement
        xit "should not dispatch godef", ->
          expect(false).toBe(true)

      describe "with a word under the cursor", ->
        beforeEach ->
          runs ->
            editor.setText testText
            editor.save()

          waitsFor ->
           editor.isModified() is false

        # TODO fix something async-funky making this test fail
        describe "defined within the current file", ->
          xit "should move the cursor to the definition", ->
            done = false
            subscription = dispatch.godef.onDidComplete ->
              # `new Point` always results in ReferenceError (why?), hence array
              expect(editor.getCursorBufferPosition().toArray()).toEqual([2,5]) #"testvar" decl
              done = true
            runs ->
              editor.setCursorBufferPosition([4,24]) # "testvar" use
              atom.commands.dispatch(workspaceElement, dispatch.godef.commandName)
            waitsFor ->
              done == true
            runs ->
              subscription.dispose()

          it "should create a highlight decoration of the correct class", ->
            done = false
            subscription = dispatch.godef.onDidComplete ->
              higlightClass = 'goplus-godef-highlight'
              goPlusHighlightDecs = (d for d in editor.getHighlightDecorations() when d.getProperties()['class'] == higlightClass)
              expect(goPlusHighlightDecs.length).toBe(1)
              done = true
            runs ->
              editor.setCursorBufferPosition([4,24]) # "testvar"
              atom.commands.dispatch(workspaceElement, dispatch.godef.commandName)
            waitsFor ->
              done == true
            runs ->
              subscription.dispose()

        describe "defined outside the current file", ->
          it "should open a new text editor", ->
            done = false
            subscription = dispatch.godef.onDidComplete ->
              # `new Point` always results in ReferenceError (why?), hence array
              currentEditor = atom.workspace.getActiveTextEditor()
              expect(currentEditor.getTitle()).toBe('print.go')
              done = true
            runs ->
              editor.setCursorBufferPosition([4,10]) # "fmt.Println"
              atom.commands.dispatch(workspaceElement, dispatch.godef.commandName)
            waitsFor ->
              done == true
            runs ->
              subscription.dispose()
