path = require('path')
fs = require('fs-plus')
temp = require('temp').track()
_ = require ("underscore-plus")
{Subscriber} = require 'emissary'

describe "godef", ->
  [mainModule, editor, editorView, dispatch, filePath, workspaceElement] = []
  testText = "package main\n import \"fmt\"\n var testvar = \"stringy\"\n\nfunc f(){fmt.Println( testvar )}\n\n"

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
      godefCommand = (cmd for cmd in currentCommands when cmd.name is dispatch.godef.commandName)
      expect(godefCommand.length).toEqual(1)

  describe "when godef command is invoked", ->

    describe "if there is more than one cursor", ->
      it "displays a warning message", ->
        done = false
        runs ->
          dispatch.once 'dispatch-complete', ->
            done = true
          editor.setText testText
          editor.save()
        waitsFor ->
          done is true
        editor.setCursorBufferPosition([0, 0])
        editor.addCursorAtBufferPosition([1, 0])
        atom.commands.dispatch(workspaceElement, dispatch.godef.commandName)

        expect(dispatch.messages?).toBe(true)
        expect(_.size(dispatch.messages)).toBe 1
        expect(dispatch.messages[0].type).toBe("warning")

    describe "with no word under the cursor", ->

      it "displays a warning message", ->
        editor.setCursorBufferPosition([0, 0])
        atom.commands.dispatch(workspaceElement, dispatch.godef.commandName)
        expect(dispatch.messages?).toBe(true)
        expect(_.size(dispatch.messages)).toBe 1
        expect(dispatch.messages[0].type).toBe("warning")

    describe "with a word under the cursor", ->
      beforeEach ->
        done = false
        runs ->
          dispatch.once 'dispatch-complete', ->
            done = true
          editor.setText testText
          editor.save()
        waitsFor ->
          done is true

      describe "defined within the current file", ->
        it "should move the cursor to the definition", ->
          done = false
          subscription = dispatch.godef.onDidComplete ->
            # `new Point` always results in ReferenceError (why?), hence array
            expect(editor.getCursorBufferPosition().toArray()).toEqual([2, 5]) #"testvar" decl
            done = true
          runs ->
            editor.setCursorBufferPosition([4, 24]) # "testvar" use
            atom.commands.dispatch(workspaceElement, dispatch.godef.commandName)
          waitsFor ->
            done is true
          runs ->
            subscription.dispose()

        it "should create a highlight decoration of the correct class", ->
          done = false
          subscription = dispatch.godef.onDidComplete ->
            higlightClass = 'definition'
            goPlusHighlightDecs = (d for d in editor.getHighlightDecorations() when d.getProperties()['class'] is higlightClass)
            expect(goPlusHighlightDecs.length).toBe(1)
            done = true
          runs ->
            editor.setCursorBufferPosition([4, 24]) # "testvar"
            atom.commands.dispatch(workspaceElement, dispatch.godef.commandName)
          waitsFor ->
            done is true
          runs ->
            subscription.dispose()

      describe "defined outside the current file", ->
        it "should open a new text editor", ->
          done = false
          subscription = dispatch.godef.onDidComplete ->
            currentEditor = atom.workspace.getActiveTextEditor()
            expect(currentEditor.getTitle()).toBe('print.go')
            done = true
          runs ->
            editor.setCursorBufferPosition([4, 10]) # "fmt.Println"
            atom.commands.dispatch(workspaceElement, dispatch.godef.commandName)
          waitsFor ->
            done is true
          runs ->
            subscription.dispose()
