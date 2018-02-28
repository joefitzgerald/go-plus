'use babel'
/* eslint-env jasmine */

import path from 'path'
import {lifecycle} from './../spec-helpers'

describe('gocodeprovider', () => {
  let completionDelay = null
  let autocompleteplusMain = null
  let autocompleteManager = null
  let provider = null
  let editor = null
  let editorView = null
  let workspaceElement = null
  let suggestions = null
  let suggestionsPromise = null
  let callCounter = 0

  beforeEach(() => {
    runs(() => {
      lifecycle.setup()
    })

    waitsForPromise(() => {
      return atom.packages.activatePackage('autocomplete-plus').then((pack) => {
        autocompleteplusMain = pack.mainModule
      })
    })
    waitsFor(() => {
      return autocompleteplusMain.autocompleteManager && autocompleteplusMain.autocompleteManager.ready
    })

    waitsForPromise(() => {
      return lifecycle.activatePackage()
    })

    runs(() => {
      spyOn(lifecycle.mainModule, 'provideAutocomplete').andCallThrough()
    })

    runs(() => {
      workspaceElement = atom.views.getView(atom.workspace)
      jasmine.attachToDOM(workspaceElement)

      // autocomplete-plus
      autocompleteManager = autocompleteplusMain.autocompleteManager
      spyOn(autocompleteManager, 'displaySuggestions').andCallThrough()
      spyOn(autocompleteManager, 'showSuggestionList').andCallThrough()
      spyOn(autocompleteManager, 'hideSuggestionList').andCallThrough()
      atom.config.set('autocomplete-plus.enableAutoActivation', true)
      completionDelay = 100
      atom.config.set('autocomplete-plus.autoActivationDelay', completionDelay)
      completionDelay += 100 // Rendering delay

      // autocomplete-go
      atom.config.set('go-plus.autocomplete.snippetMode', 'nameAndType')
      provider = lifecycle.mainModule.provideAutocomplete()
      spyOn(provider, 'getSuggestions').andCallThrough()
      provider.onDidInsertSuggestion = jasmine.createSpy()
      provider.onDidGetSuggestions((p) => {
        suggestionsPromise = p
      })

      suggestions = null
      callCounter = 0
    })

    waitsFor(() => {
      return provider.ready()
    })
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  function resetSuggestionsAndPromise () {
    suggestions = null
    suggestionsPromise = null
  }

  function waitForSuggestions () {
    const call = ++callCounter

    waitsFor(() => {
      return provider.getSuggestions.calls.length === call && suggestionsPromise !== null
    })

    waitsForPromise(() => {
      return suggestionsPromise.then((s) => {
        suggestions = s
        suggestionsPromise = null // reset it so that the next call `waitsFor` above waits
      })
    })
  }

  function expectAnySuggestions () {
    expect(suggestions).toBeTruthy()
    expect(suggestions.length).toBeGreaterThan(0)
  }

  function insertText (editor, text) {
    const last = text.slice(-1)
    const prefix = text.slice(0, -1)
    if (prefix) {
      editor.insertText(prefix)
    }
    // only the last character triggers `getSuggestions`
    editor.insertText(last)
    advanceClock(completionDelay)
  }

  function openFileAt (file, row, column) {
    waitsForPromise(() => {
      return atom.workspace.open(file).then((e) => {
        editor = e
        editorView = atom.views.getView(editor)
      })
    })

    runs(() => {
      expect(provider).toBeDefined()
      expect(provider.getSuggestions).not.toHaveBeenCalled()
      expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
      editor.setCursorScreenPosition([row, column])
    })
  }

  describe('different snippetMode settings result in different suggestions', () => {
    const file = path.join('basic', 'main.go')

    describe('when snippetMode is nameAndType', () => {
      beforeEach(() => {
        atom.config.set('go-plus.autocomplete.snippetMode', 'nameAndType')
      })

      it('generates snippets with name and type argument placeholders', () => {
        openFileAt(file, 5, 6)

        runs(() => {
          insertText(editor, 'P')
        })

        waitForSuggestions()

        runs(() => {
          expectAnySuggestions()

          expect(suggestions[0]).toBeTruthy()
          expect(suggestions[0].displayText).toBe('Print(a ...interface{})')
          expect(suggestions[0].snippet).toBe('Print()$0')
          expect(suggestions[0].replacementPrefix).toBe('P')
          expect(suggestions[0].type).toBe('function')
          expect(suggestions[0].leftLabel).toBe('(n int, err error)')
          editor.backspace()
        })
      })
    })

    describe('when snippetMode is name', () => {
      beforeEach(() => {
        atom.config.set('go-plus.autocomplete.snippetMode', 'name')
      })

      it('generates snippets with name argument placeholders', () => {
        openFileAt(file, 5, 6)

        runs(() => {
          insertText(editor, 'P')
        })

        waitForSuggestions()

        runs(() => {
          expectAnySuggestions()

          expect(suggestions[0]).toBeTruthy()
          expect(suggestions[0].displayText).toBe('Print(a ...interface{})')
          expect(suggestions[0].snippet).toBe('Print()$0')
          expect(suggestions[0].replacementPrefix).toBe('P')
          expect(suggestions[0].type).toBe('function')
          expect(suggestions[0].leftLabel).toBe('(n int, err error)')
          editor.backspace()
        })
      })
    })

    describe('when snippetMode is none', () => {
      beforeEach(() => {
        atom.config.set('go-plus.autocomplete.snippetMode', 'none')
      })

      it('generates snippets with no args', () => {
        openFileAt(file, 5, 6)

        runs(() => {
          insertText(editor, 'P')
        })

        waitForSuggestions()

        runs(() => {
          expectAnySuggestions()

          expect(suggestions[0]).toBeTruthy()
          expect(suggestions[0].displayText).toBe('Print(a ...interface{})')
          expect(suggestions[0].snippet).toBe('Print($1)$0')
          expect(suggestions[0].replacementPrefix).toBe('P')
          expect(suggestions[0].type).toBe('function')
          expect(suggestions[0].leftLabel).toBe('(n int, err error)')
          editor.backspace()
        })
      })
    })
  })

  describe('scenarios', () => {
    describe('provides suggestions for unimported packages', () => {
      beforeEach(() => {
        atom.config.set('go-plus.autocomplete.snippetMode', 'nameAndType')
      })

      it('provides the exported types of the unimported package', () => {
        waitsFor(() => provider.allPkgs.size > 0)

        openFileAt(path.join('basic', 'main.go'), 7, 0)

        runs(() => {
          // get suggestions for package 'github.com/sqs/goreturns/returns'
          insertText(editor, 'returns.')
        })

        waitForSuggestions()

        runs(() => {
          expectAnySuggestions()

          expect(suggestions[0]).toBeTruthy()
          expect(suggestions[0].displayText).toBe('Process(pkgDir string, filename string, src []byte, opt *returns.Options)')
        })
      })
    })

    it('does not continue with suggestions from fmt after fmt.Printf(', () => {
      openFileAt(path.join('autocomplete', 'fmt-with-variable', 'main.go'), 7, 0)

      // add "fmt."
      runs(() => {
        insertText(editor, 'fmt.')
      })

      waitForSuggestions()

      // this results in several suggestions like Printf, Errorf
      runs(expectAnySuggestions)

      // complete the text by adding "Printf("
      runs(() => {
        insertText(editor, 'Printf(')
      })

      waitForSuggestions()

      runs(resetSuggestionsAndPromise)

      // get new suggestions for "f"
      runs(() => {
        insertText(editor, 'f')
      })

      waitForSuggestions()

      // should return a suggestion for "foo"
      runs(() => {
        expectAnySuggestions()
        expect(suggestions.find((s) => s.text === 'foo')).toBeTruthy()
      })
    })
  })

  describe('when the go-plus-issue-307 file is opened', () => {
    const file = path.join('go-plus-issue-307', 'main.go')

    it('returns suggestions to autocomplete-plus scenario 1', () => {
      openFileAt(file, 13, 0)

      runs(() => {
        insertText(editor, '\tSayHello("world").')
      })

      waitForSuggestions()

      runs(() => {
        expectAnySuggestions()

        expect(suggestions[0]).toBeTruthy()
        expect(suggestions[0].displayText).toBe('Fatal(v ...interface{})')
        expect(suggestions[0].snippet).toBe('Fatal()$0')
        expect(suggestions[0].replacementPrefix).toBe('')
        expect(suggestions[0].type).toBe('function')
        expect(suggestions[0].leftLabel).toBe('')
        editor.backspace()
      })
    })

    it('returns suggestions to autocomplete-plus scenario 2', () => {
      openFileAt(file, 13, 0)

      runs(() => {
        insertText(editor, '\tSayHello("world") .')
      })

      waitForSuggestions()

      runs(() => {
        expectAnySuggestions()

        expect(suggestions[0]).toBeTruthy()
        expect(suggestions[0].displayText).toBe('Fatal(v ...interface{})')
        expect(suggestions[0].snippet).toBe('Fatal()$0')
        expect(suggestions[0].replacementPrefix).toBe('')
        expect(suggestions[0].type).toBe('function')
        expect(suggestions[0].leftLabel).toBe('')
        editor.backspace()
      })
    })

    it('returns suggestions to autocomplete-plus scenario 3', () => {
      openFileAt(file, 13, 0)

      runs(() => {
        insertText(editor, '\tSayHello("world")  .')
      })

      waitForSuggestions()

      runs(() => {
        expectAnySuggestions()

        expect(suggestions[0]).toBeTruthy()
        expect(suggestions[0].displayText).toBe('Fatal(v ...interface{})')
        expect(suggestions[0].snippet).toBe('Fatal()$0')
        expect(suggestions[0].replacementPrefix).toBe('')
        expect(suggestions[0].type).toBe('function')
        expect(suggestions[0].leftLabel).toBe('')
        editor.backspace()
      })
    })

    // TODO: Atom's prefix regex of: /(\b|['"~`!@#$%^&*(){}[\]=+,/?>])((\w+[\w-]*)|([.:;[{(< ]+))$/
    // returns an empty prefix when a '.' character is preceded by a \t
    xit('returns suggestions to autocomplete-plus scenario 4', () => {
      openFileAt(file, 13, 0)

      runs(() => {
        insertText(editor, '\tSayHello("world")\t.')
      })

      waitForSuggestions()

      runs(() => {
        expectAnySuggestions()

        expect(suggestions[0]).toBeTruthy()
        expect(suggestions[0].displayText).toBe('Fatal(v ...interface{})')
        expect(suggestions[0].snippet).toBe('Fatal()$0')
        expect(suggestions[0].replacementPrefix).toBe('')
        expect(suggestions[0].type).toBe('function')
        expect(suggestions[0].leftLabel).toBe('')
        editor.backspace()
      })
    })
  })
})
