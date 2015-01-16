# TODO:
# get the 1st test to pass

path = require 'path'
fs = require 'fs-plus'
temp = require('temp').track()
_ = require ("underscore-plus")

describe "godef", ->
  [editor, editorView, dispatch, buffer, filePath, workspaceElement] = []

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


      describe "with the cursor on a word start", ->
        fit "should open a new text editor", ->
          wordToDefine = "word"
          editor.setText(wordToDefine)
          editor.setCursorBufferPosition([1,1])
          atom.commands.dispatch(workspaceElement, dispatch.godef.commandName)

          done = false
          runs ->
            expect(atom.workspace.getActiveTextEditor()).not.toBe(editor)
            # This fails, because the open is asynchronous (at this stage we have the .go source file still)
            # How to test this? The command dispatch sets off an asynchronous open
            # (ie. of the file containing the word definition)
            # The command dispatch does not itself return a promise. So what is there to wait for
            done = true

          waitsFor ->
            done is true
