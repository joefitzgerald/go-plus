path = require 'path'
{WorkspaceView} = require 'atom'
_ = require 'underscore-plus'
AtomConfig = require './util/atomconfig'

describe 'gocode', ->
  [editor, editorView, dispatch, buffer, completionDelay] = []

  beforeEach ->
    atomconfig = new AtomConfig()
    atomconfig.allfunctionalitydisabled()
    atom.workspaceView = new WorkspaceView()
    atom.workspace = atom.workspaceView.model

    # Enable live autocompletion
    atom.config.set("autocomplete-plus.enableAutoActivation", true)
    # Set the completion delay
    completionDelay = 100
    atom.config.set 'autocomplete-plus.autoActivationDelay', completionDelay
    completionDelay += 100 # Rendering delay

    waitsForPromise -> atom.workspace.open('gocode.go').then (e) ->
      editor = e
      atom.workspaceView.attachToDom()

    waitsForPromise ->
      atom.packages.activatePackage('autocomplete-plus')

    waitsForPromise ->
      atom.packages.activatePackage('language-go')

    waitsForPromise ->
      atom.packages.activatePackage('go-plus')

    runs ->
      buffer = editor.getBuffer()
      dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
      dispatch.goexecutable.detect()
      editorView = atom.workspaceView.getActiveView()

    waitsFor ->
      dispatch.ready is true

  describe 'when autocomplete-plus executed', ->
    it 'display list of gocode result', ->
      runs ->
        expect(editorView.find('.autocomplete-plus')).not.toExist()

        editor.setCursorScreenPosition([5, 11])
        editor.insertText 'l'

        advanceClock completionDelay + 1000

        expect(editorView.find('.autocomplete-plus')).toExist()
        expect(editorView.find('.autocomplete-plus span.word:eq(0)')).toHaveText 'Println('
        expect(editorView.find('.autocomplete-plus span.label:eq(0)')).toHaveText 'func(a ...interface{}) (n int, err error)'
        editor.backspace()
    it 'display empty list in quotes', ->
      runs ->
        expect(editorView.find('.autocomplete-plus')).not.toExist()

        editor.setCursorScreenPosition([6, 15])
        editor.insertText 'w'

        advanceClock completionDelay + 1000

        expect(editorView.find('.autocomplete-plus')).toExist()
        expect(editorView.find('.autocomplete-plus span.word:eq(0)')).toHaveText ''
        editor.backspace()
    it 'display empty list on end of line', ->
      runs ->
        expect(editorView.find('.autocomplete-plus')).not.toExist()

        editor.setCursorScreenPosition([5, 15])
        editor.backspace()
        editor.insertText ')'

        advanceClock completionDelay + 1000

        expect(editorView.find('.autocomplete-plus')).toExist()
        expect(editorView.find('.autocomplete-plus span.word:eq(0)')).toHaveText ''

        editor.insertText ';'

        advanceClock completionDelay + 1000

        expect(editorView.find('.autocomplete-plus')).toExist()
        expect(editorView.find('.autocomplete-plus span.word:eq(0)')).toHaveText ''
        editor.backspace()
