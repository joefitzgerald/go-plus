###
  TODO
  - unit tests for the word finder?
  - match godef approach to existing go-plus
  - how to test for dispatch of a command?
  - how to wait for presentation of a new editor?
  - check for paths of exe and source files on Windows
  - copy text from test file

 Questions for

  - why function/method args sometimes, sometimes not, in brackets? (happily
    inconsistent, or is there a patter I'm not seeing?)

    A good reason to keep consistent: f() looks a lot like f () ->

 ###

path = require 'path'
fs = require 'fs-plus'
temp = require('temp').track()
_ = require ("underscore-plus")

describe "godef", ->
  [editor, editorView, dispatch, buffer, filePath, workspaceElement] = []
  testText = "package main\n import \"fmt\"\n var testvar = \"stringy\"\n\nfunc f(){fmt.Println( testvar )}"

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
      buffer = editor.getBuffer()
      buffer.setText testText
      buffer.save()
      dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
      dispatch.goexecutable.detect()

    waitsFor ->
      dispatch.ready is true

  describe "when go-plus is loaded", ->
    it "should have registered the golang:godef command",  ->
      currentCommands = atom.commands.findCommands({target: editorView})
      # get name from the godef package, rather than magick'd here?
      godefCommand = (cmd for cmd in currentCommands when cmd.name is dispatch.godef.commandName)
      expect(godefCommand.length).toEqual(1)

  describe "when godef command is invoked", ->
      describe "with no word under the cursor", ->
        it "displays a warning message", ->
          atom.commands.dispatch(workspaceElement, dispatch.godef.commandName)
          expect(dispatch.messages?).toBe(true)
          expect(_.size(dispatch.messages)).toBe 1
          expect(dispatch.messages[0].msg).toBe(dispatch.godef.warningNotFoundMessage)

        it "should not dispatch godef", ->
          expect(false).toBe(true)

      describe "with a word under the cursor", ->
        describe "defined within the current file", ->
          fit "should move the cursor to the definition", ->
            done = false
            console.log "file written to #{filePath}"
            runs ->
              editor.setCursorBufferPosition([4,24])
              atom.commands.dispatch(workspaceElement, dispatch.godef.commandName)

              ### TODO this is the test I'm working on
                   Here's the test impasse
                   Currently although gotoDefinitionForWord works, the test doesn't.
                   I think atom.commands.dispatch() is returning before the buffer
                   cursor is moved
                  So how to wait for presumably asynchronous dispatch call???

                  One possibility is to listen for an event we set up on
                  Godef::gotoDefinitionForWord
                        dispatch.godef.on 'testingdone', ->
                          console.log "I GOT IT"
                  Possibly bad? Only emitted for test?
                  Try the new Atom non-stringly event system:
                    https://github.com/atom/event-kit
                    http://blog.atom.io/2014/09/16/new-event-subscription-api.html
              ###
              expect(editor.getCursorBufferPosition().toArray()).toEqual([2,5])
              # would rather compare with a Point, but always gives me a ReferenceError
              done = true
            waitsFor ->
              done is true

        describe "defined outside the current file", ->
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

          it "with the cursor at the definition", ->
            expect(false).toBe(true)
