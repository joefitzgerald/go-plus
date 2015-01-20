###
  TODO
  - unit tests for the word finder?
  - match godef approach to existing go-plus
  - how to test for dispatch of a command?
  - how to wait for presentation of a new editor?
  - check for paths of exe and source files on Windows
  - copy test text from test file instead of using string lits?
  - deal with multiple cursors

 Questions for

  - why function/method args sometimes, sometimes not, in brackets? (happily
    inconsistent, or is there a patter I'm not seeing?)

    A good reason to keep consistent: f() looks a lot like f () ->

 ###

path = require 'path'
fs = require 'fs-plus'
temp = require('temp').track()
_ = require ("underscore-plus")
{Subscriber} = require 'emissary'

describe "godef", ->
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

    it "should return foo for |foo", ->
      editor.setText("foo")
      editor.setCursorBufferPosition([0,0])
      expect(godef.wordAtCursor()).toEqual('foo')

    it "should return foo for fo|o", ->
      editor.setText("foo")
      editor.setCursorBufferPosition([0,2])
      expect(godef.wordAtCursor()).toEqual('foo')

    # arguable, but easiest to implement using atom Cursor's methods
    it "should return empty for foo|", ->
      editor.setText("foo")
      editor.setCursorBufferPosition([0,3])
      expect(godef.wordAtCursor()).toEqual('')

    it "should return foo.bar for !foo.bar", ->
      editor.setText("foo.bar")
      editor.setCursorBufferPosition([0,0])
      expect(godef.wordAtCursor()).toEqual('foo.bar')

    it "should return foo.bar for foo.ba|r", ->
      editor.setText("foo.bar")
      editor.setCursorBufferPosition([0,6])
      expect(godef.wordAtCursor()).toEqual('foo.bar')

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
        xdescribe "defined within the current file", ->
          it "should move the cursor to the definition", ->
            done = false
            subscription = dispatch.godef.on "#{dispatch.godef.name}-complete", ->
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

        # TODO implement
        xdescribe "defined outside the current file", ->
          it "should open a new text editor", ->

            done = false
            runs ->
              editor.setText("notAGoKeyword")
              editor.setCursorBufferPosition([1,1])
              atom.commands.dispatch(workspaceElement, dispatch.godef.commandName)
              newItemWatcher = atom.workspace.onDidChangeActivePaneItem (item) ->
                console.log "new ITEM: #{item}"
                expect(item).not.toBe(editor)
                done = true
                newItemWatcher dispose()

            waitsFor ->
              done is true
