path = require('path')
_ = require('underscore-plus')
AtomConfig = require('./util/atomconfig')

describe 'gocode', ->
  [workspaceElement, editor, editorView, dispatch, buffer, completionDelay, goplusMain, autocompleteMain, autocompleteManager, provider] = []

  beforeEach ->
    runs ->
      atomconfig = new AtomConfig()
      atomconfig.allfunctionalitydisabled()

      # Enable live autocompletion
      atom.config.set('autocomplete-plus.enableAutoActivation', true)
      atom.config.set('go-plus.suppressBuiltinAutocompleteProvider', false)
      # Set the completion delay
      completionDelay = 100
      atom.config.set('autocomplete-plus.autoActivationDelay', completionDelay)
      completionDelay += 100 # Rendering delay

      workspaceElement = atom.views.getView(atom.workspace)
      jasmine.attachToDOM(workspaceElement)

      pack = atom.packages.loadPackage('go-plus')
      goplusMain = pack.mainModule
      spyOn(goplusMain, 'provide').andCallThrough()
      spyOn(goplusMain, 'setDispatch').andCallThrough()
      pack = atom.packages.loadPackage('autocomplete-plus')
      autocompleteMain = pack.mainModule
      spyOn(autocompleteMain, 'consumeProvider').andCallThrough()
      jasmine.unspy(window, 'setTimeout')

    waitsForPromise -> atom.workspace.open('gocode.go').then (e) ->
      editor = e
      editorView = atom.views.getView(editor)

    waitsForPromise ->
      atom.packages.activatePackage('autocomplete-plus')

    waitsFor ->
      autocompleteMain.autocompleteManager?.ready

    runs ->
      autocompleteManager = autocompleteMain.getAutocompleteManager()
      spyOn(autocompleteManager, 'displaySuggestions').andCallThrough()
      spyOn(autocompleteManager, 'showSuggestionList').andCallThrough()
      spyOn(autocompleteManager, 'hideSuggestionList').andCallThrough()

    waitsForPromise ->
      atom.packages.activatePackage('language-go')

    runs ->
      expect(goplusMain.provide).not.toHaveBeenCalled()
      expect(goplusMain.provide.calls.length).toBe(0)

    waitsForPromise ->
      atom.packages.activatePackage('go-plus')

    waitsFor ->
      goplusMain.provide.calls.length is 1

    waitsFor ->
      autocompleteMain.consumeProvider.calls.length is 1

    waitsFor ->
      goplusMain.dispatch?.ready

    waitsFor ->
      goplusMain.setDispatch.calls.length >= 1

    runs ->
      expect(goplusMain.provide).toHaveBeenCalled()
      expect(goplusMain.provider).toBeDefined()
      provider = goplusMain.provider
      spyOn(provider, 'getSuggestions').andCallThrough()
      provider.onDidInsertSuggestion = jasmine.createSpy()
      expect(_.size(autocompleteManager.providerManager.providersForScopeDescriptor('.source.go'))).toEqual(1)
      expect(autocompleteManager.providerManager.providersForScopeDescriptor('.source.go')[0]).toEqual(provider)
      buffer = editor.getBuffer()
      dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
      dispatch.goexecutable.detect()

  afterEach ->
    jasmine.unspy(goplusMain, 'provide')
    jasmine.unspy(goplusMain, 'setDispatch')
    jasmine.unspy(autocompleteManager, 'displaySuggestions')
    jasmine.unspy(autocompleteMain, 'consumeProvider')
    jasmine.unspy(autocompleteManager, 'hideSuggestionList')
    jasmine.unspy(autocompleteManager, 'showSuggestionList')
    jasmine.unspy(provider, 'getSuggestions')

  describe 'when the gocode autocomplete-plus provider is enabled', ->

    it 'displays suggestions from gocode', ->
      runs ->
        expect(provider).toBeDefined()
        expect(provider.getSuggestions).not.toHaveBeenCalled()
        expect(autocompleteManager.displaySuggestions).not.toHaveBeenCalled()
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
        editor.setCursorScreenPosition([5, 6])
        advanceClock(completionDelay)

      waitsFor ->
        autocompleteManager.hideSuggestionList.calls.length is 1

      runs ->
        editor.insertText('P')
        advanceClock(completionDelay)

      waitsFor ->
        autocompleteManager.showSuggestionList.calls.length is 1

      waitsFor ->
        editorView.querySelector('.autocomplete-plus span.word')?

      runs ->
        expect(provider.getSuggestions).toHaveBeenCalled()
        expect(provider.getSuggestions.calls.length).toBe(1)
        expect(editorView.querySelector('.autocomplete-plus')).toExist()
        expect(editorView.querySelector('.autocomplete-plus span.word').innerHTML).toBe('<span class="character-match">P</span>rint(<span class="snippet-completion">a ...interface{}</span>)')
        expect(editorView.querySelector('.autocomplete-plus span.left-label').innerHTML).toBe('n int, err error')
        editor.backspace()

    it 'confirms a suggestion when the prefix case does not match', ->
      runs ->
        expect(provider).toBeDefined()
        expect(provider.getSuggestions).not.toHaveBeenCalled()
        expect(autocompleteManager.displaySuggestions).not.toHaveBeenCalled()
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
        editor.setCursorScreenPosition([7, 0])
        advanceClock(completionDelay)

      waitsFor ->
        autocompleteManager.hideSuggestionList.calls.length is 1

      runs ->
        editor.insertText('    fmt.')
        editor.insertText('p')
        advanceClock(completionDelay)

      waitsFor ->
        autocompleteManager.showSuggestionList.calls.length is 1

      waitsFor ->
        editorView.querySelector('.autocomplete-plus span.word')?

      runs ->
        expect(provider.getSuggestions).toHaveBeenCalled()
        expect(provider.getSuggestions.calls.length).toBe(1)
        expect(provider.onDidInsertSuggestion).not.toHaveBeenCalled()
        expect(editorView.querySelector('.autocomplete-plus span.word').innerHTML).toBe('<span class="character-match">P</span>rint(<span class="snippet-completion">a ...interface{}</span>)')
        suggestionListView = editorView.querySelector('.autocomplete-plus autocomplete-suggestion-list')
        atom.commands.dispatch(suggestionListView, 'autocomplete-plus:confirm')

      waitsFor ->
        provider.onDidInsertSuggestion.calls.length is 1

      runs ->
        expect(provider.onDidInsertSuggestion).toHaveBeenCalled()
        expect(buffer.getTextInRange([[7, 4], [7, 9]])).toBe('fmt.P')

    it 'confirms a suggestion when the prefix case does not match', ->
      runs ->
        expect(provider).toBeDefined()
        expect(provider.getSuggestions).not.toHaveBeenCalled()
        expect(autocompleteManager.displaySuggestions).not.toHaveBeenCalled()
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
        editor.setCursorScreenPosition([7, 0])
        advanceClock(completionDelay)

      waitsFor ->
        autocompleteManager.hideSuggestionList.calls.length is 1

      runs ->
        editor.insertText('    fmt.p')
        editor.insertText('r')
        advanceClock(completionDelay)

      waitsFor ->
        autocompleteManager.showSuggestionList.calls.length is 1

      waitsFor ->
        editorView.querySelector('.autocomplete-plus span.word')?

      runs ->
        expect(provider.getSuggestions).toHaveBeenCalled()
        expect(provider.getSuggestions.calls.length).toBe(1)
        expect(provider.onDidInsertSuggestion).not.toHaveBeenCalled()
        expect(editorView.querySelector('.autocomplete-plus span.word').innerHTML).toBe('<span class="character-match">P</span><span class="character-match">r</span>int(<span class="snippet-completion">a ...interface{}</span>)')
        suggestionListView = editorView.querySelector('.autocomplete-plus autocomplete-suggestion-list')
        atom.commands.dispatch(suggestionListView, 'autocomplete-plus:confirm')

      waitsFor ->
        provider.onDidInsertSuggestion.calls.length is 1

      runs ->
        expect(provider.onDidInsertSuggestion).toHaveBeenCalled()
        expect(buffer.getTextInRange([[7, 4], [7, 10]])).toBe('fmt.Pr')

    xit 'does not display suggestions when no gocode suggestions exist', ->
      runs ->
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist()

        editor.setCursorScreenPosition([6, 15])
        advanceClock(completionDelay)

      waitsFor ->
        autocompleteManager.hideSuggestionList.calls.length is 1

      runs ->
        editor.insertText('w')
        advanceClock(completionDelay)

      waitsFor ->
        autocompleteManager.hideSuggestionList.calls.length is 2

      runs ->
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist()

    it 'does not display suggestions at the end of a line when no gocode suggestions exist', ->
      runs ->
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist()

        editor.setCursorScreenPosition([5, 15])
        advanceClock(completionDelay)

      waitsFor ->
        autocompleteManager.hideSuggestionList.calls.length is 1

      waitsFor ->
        autocompleteManager.displaySuggestions.calls.length is 0

      runs ->
        editor.insertText(')')
        advanceClock(completionDelay)

      waitsFor ->
        autocompleteManager.displaySuggestions.calls.length is 1

      runs ->
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
        editor.insertText(';')

      waitsFor ->
        autocompleteManager.displaySuggestions.calls.length is 1
        advanceClock(completionDelay)

      runs ->
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
