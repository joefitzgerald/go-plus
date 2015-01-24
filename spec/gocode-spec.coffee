path = require 'path'
_ = require 'underscore-plus'
AtomConfig = require './util/atomconfig'

describe 'gocode', ->
  [workspaceElement, editor, editorView, dispatch, buffer, completionDelay, autocompleteManager] = []

  beforeEach ->
    atomconfig = new AtomConfig()
    atomconfig.allfunctionalitydisabled()

    # Enable live autocompletion
    atom.config.set("autocomplete-plus.enableAutoActivation", true)
    # Set the completion delay
    completionDelay = 100
    atom.config.set 'autocomplete-plus.autoActivationDelay', completionDelay
    completionDelay += 100 # Rendering delay

    workspaceElement = atom.views.getView(atom.workspace)
    jasmine.attachToDOM(workspaceElement)

    waitsForPromise -> atom.workspace.open('gocode.go').then (e) ->
      editor = e
      editorView = atom.views.getView(editor)

    waitsForPromise ->
      atom.packages.activatePackage('autocomplete-plus').then (a) ->
        autocompleteManager = a.mainModule.autocompleteManager

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

  describe 'when the gocode autocomplete-plus provider is enabled', ->

    it 'displays suggestions from gocode', ->
      [done] = []
      runs ->
        done = false
        autocompleteManager.onDidAutocomplete ->
          done = true
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist()

        editor.setCursorScreenPosition([5, 6])
        editor.insertText 'P'

        advanceClock completionDelay + 1000

      waitsFor ->
        done is true

      runs ->
        expect(editorView.querySelector('.autocomplete-plus')).toExist()
        expect(editorView.querySelector('.autocomplete-plus span.word')).toHaveText('Print(')
        expect(editorView.querySelector('.autocomplete-plus span.label')).toHaveText('func(a ...interface{}) (n int, err error)')
        editor.backspace()

    it 'does not display suggestions when no gocode suggestions exist', ->
      runs ->
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist()

        editor.setCursorScreenPosition([6, 15])
        editor.insertText 'w'

        advanceClock completionDelay + 1000

        expect(editorView.querySelector('.autocomplete-plus')).not.toExist()

    it 'does not display suggestions at the end of a line when no gocode suggestions exist', ->
      runs ->
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist()

        editor.setCursorScreenPosition([5, 15])
        editor.backspace()
        editor.insertText ')'
        advanceClock completionDelay + 1000
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
        editor.insertText ';'
        advanceClock completionDelay + 1000
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
