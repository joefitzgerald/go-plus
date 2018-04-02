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
  let suggestionsPromise = null

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
    })

    waitsFor(() => {
      return provider.ready()
    })
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  describe('when the basic file is opened', () => {
    beforeEach(() => {
      waitsForPromise(() => {
        return atom.workspace.open('basic' + path.sep + 'main.go').then((e) => {
          editor = e
          editorView = atom.views.getView(editor)
        })
      })
    })

    describe('when snippetMode is nameAndType', () => {
      beforeEach(() => {
        atom.config.set('go-plus.autocomplete.snippetMode', 'nameAndType')
      })

      it('generates snippets with name and type argument placeholders', () => {
        let suggestions = null
        runs(() => {
          expect(provider).toBeDefined()
          expect(provider.getSuggestions).not.toHaveBeenCalled()
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
          editor.setCursorScreenPosition([5, 6])
          editor.insertText('P')
          advanceClock(completionDelay)
        })

        waitsFor(() => {
          return provider.getSuggestions.calls.length === 1 && suggestionsPromise !== null
        })

        waitsForPromise(() => {
          return suggestionsPromise.then((s) => {
            suggestions = s
          })
        })

        runs(() => {
          expect(provider.getSuggestions).toHaveBeenCalled()
          expect(provider.getSuggestions.calls.length).toBe(1)
          expect(suggestions).toBeTruthy()
          expect(suggestions.length).toBeGreaterThan(0)
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
        let suggestions = null
        runs(() => {
          expect(provider).toBeDefined()
          expect(provider.getSuggestions).not.toHaveBeenCalled()
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
          editor.setCursorScreenPosition([5, 6])
          editor.insertText('P')
          advanceClock(completionDelay)
        })

        waitsFor(() => {
          return provider.getSuggestions.calls.length === 1 && suggestionsPromise !== null
        })

        waitsForPromise(() => {
          return suggestionsPromise.then((s) => {
            suggestions = s
          })
        })

        runs(() => {
          expect(provider.getSuggestions).toHaveBeenCalled()
          expect(provider.getSuggestions.calls.length).toBe(1)
          expect(suggestions).toBeTruthy()
          expect(suggestions.length).toBeGreaterThan(0)
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
        let suggestions = null
        runs(() => {
          expect(provider).toBeDefined()
          expect(provider.getSuggestions).not.toHaveBeenCalled()
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
          editor.setCursorScreenPosition([5, 6])
          editor.insertText('P')
          advanceClock(completionDelay)
        })

        waitsFor(() => {
          return provider.getSuggestions.calls.length === 1 && suggestionsPromise !== null
        })

        waitsForPromise(() => {
          return suggestionsPromise.then((s) => {
            suggestions = s
          })
        })

        runs(() => {
          expect(provider.getSuggestions).toHaveBeenCalled()
          expect(provider.getSuggestions.calls.length).toBe(1)
          expect(suggestions).toBeTruthy()
          expect(suggestions.length).toBeGreaterThan(0)
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

    describe('provides suggestions for unimported packages', () => {
      beforeEach(() => {
        atom.config.set('go-plus.autocomplete.snippetMode', 'nameAndType')
      })

      it('provides the exported types of the unimported package', () => {
        let suggestions = null

        waitsFor(() => provider.allPkgs.size > 0)

        runs(() => {
          expect(provider).toBeDefined()
          expect(provider.getSuggestions).not.toHaveBeenCalled()
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
          editor.setCursorScreenPosition([7, 0])

          // get suggestions for package 'github.com/sqs/goreturns/returns'
          editor.insertText('returns')
          advanceClock(completionDelay)
          editor.insertText('.')
          advanceClock(completionDelay)
        })

        waitsFor(() => {
          return provider.getSuggestions.calls.length === 1 && suggestionsPromise !== null
        })

        waitsForPromise(() => {
          return suggestionsPromise.then((s) => {
            suggestions = s
          })
        })

        runs(() => {
          expect(provider.getSuggestions).toHaveBeenCalled()
          expect(provider.getSuggestions.calls.length).toBe(1)
          expect(suggestions).toBeTruthy()
          expect(suggestions.length).toBeGreaterThan(0)
          expect(suggestions[0]).toBeTruthy()
          expect(suggestions[0].displayText).toBe('Process(pkgDir string, filename string, src []byte, opt *returns.Options)')
        })
      })
    })
  })

  describe('when the go-plus-issue-745 file is opened', () => {
    let suggestions = null
    beforeEach(() => {
      waitsForPromise(() => {
        return atom.workspace.open('go-plus-issue-745' + path.sep + 'main.go').then((e) => {
          editor = e
          editorView = atom.views.getView(editor)
        })
      })
    })

    it('calculates the prefix correctly', () => {
      runs(() => {
        expect(provider).toBeDefined()
        expect(provider.getSuggestions).not.toHaveBeenCalled()
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
        editor.setCursorBufferPosition([4, 10])
        editor.backspace()
        editor.backspace()
        editor.backspace()
        suggestions = null
        suggestionsPromise = null
        advanceClock(completionDelay)
      })

      runs(() => {
        expect(provider.getSuggestions.calls.length).toBe(0)
        expect(suggestionsPromise).toBeFalsy()
        editor.insertText('t')
        advanceClock(completionDelay)
      })

      waitsFor(() => {
        return provider.getSuggestions.calls.length === 1 && suggestionsPromise !== null
      })

      waitsForPromise(() => {
        return suggestionsPromise.then((s) => {
          suggestions = s
        })
      })

      runs(() => {
        expect(provider.getSuggestions.calls.length).toBe(1)
        expect(suggestionsPromise).toBeTruthy()
        suggestionsPromise = null
        editor.insertText('t')
        advanceClock(completionDelay)
      })

      waitsFor(() => {
        return provider.getSuggestions.calls.length === 2 && suggestionsPromise !== null
      })

      waitsForPromise(() => {
        return suggestionsPromise.then((s) => {
          suggestions = s
        })
      })

      runs(() => {
        expect(provider.getSuggestions).toHaveBeenCalled()
        expect(provider.getSuggestions.calls.length).toBe(2)
        expect(suggestions).toBeTruthy()
        expect(suggestions.length).toBeGreaterThan(0)
        expect(suggestions[0]).toBeTruthy()
        expect(suggestions[0].text).toBe('net/http')
        expect(suggestions[0].replacementPrefix).toBe('net/htt')
      })
    })
  })

  describe('when the go-plus-issue-307 file is opened', () => {
    let suggestions = null
    beforeEach(() => {
      waitsForPromise(() => {
        return atom.workspace.open('go-plus-issue-307' + path.sep + 'main.go').then((e) => {
          editor = e
          editorView = atom.views.getView(editor)
        })
      })
    })

    it('returns suggestions to autocomplete-plus scenario 1', () => {
      runs(() => {
        expect(provider).toBeDefined()
        expect(provider.getSuggestions).not.toHaveBeenCalled()
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
        editor.setCursorScreenPosition([13, 0])
        editor.insertText('\tSayHello("world")')
        suggestions = null
        suggestionsPromise = null
        advanceClock(completionDelay)
      })

      runs(() => {
        expect(provider.getSuggestions.calls.length).toBe(0)
        expect(suggestionsPromise).toBeFalsy()
        editor.insertText('.')
        advanceClock(completionDelay)
      })

      waitsFor(() => {
        return provider.getSuggestions.calls.length === 1 && suggestionsPromise !== null
      })

      waitsForPromise(() => {
        return suggestionsPromise.then((s) => {
          suggestions = s
        })
      })

      runs(() => {
        expect(provider.getSuggestions).toHaveBeenCalled()
        expect(provider.getSuggestions.calls.length).toBe(1)
        expect(suggestions).toBeTruthy()
        expect(suggestions.length).toBeGreaterThan(0)
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
      runs(() => {
        expect(provider).toBeDefined()
        expect(provider.getSuggestions).not.toHaveBeenCalled()
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
        editor.setCursorScreenPosition([13, 0])
        editor.insertText('\tSayHello("world") ')
        suggestions = null
        suggestionsPromise = null
        advanceClock(completionDelay)
      })

      runs(() => {
        expect(provider.getSuggestions.calls.length).toBe(0)
        expect(suggestionsPromise).toBeFalsy()
        editor.insertText('.')
        advanceClock(completionDelay)
      })

      waitsFor(() => {
        return provider.getSuggestions.calls.length === 1 && suggestionsPromise !== null
      })

      waitsForPromise(() => {
        return suggestionsPromise.then((s) => {
          suggestions = s
        })
      })

      runs(() => {
        expect(provider.getSuggestions).toHaveBeenCalled()
        expect(provider.getSuggestions.calls.length).toBe(1)
        expect(suggestions).toBeTruthy()
        expect(suggestions.length).toBeGreaterThan(0)
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
      runs(() => {
        expect(provider).toBeDefined()
        expect(provider.getSuggestions).not.toHaveBeenCalled()
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
        editor.setCursorScreenPosition([13, 0])
        editor.insertText('\tSayHello("world")  ')
        suggestions = null
        suggestionsPromise = null
        advanceClock(completionDelay)
      })

      runs(() => {
        expect(provider.getSuggestions.calls.length).toBe(0)
        expect(suggestionsPromise).toBeFalsy()
        editor.insertText('.')
        advanceClock(completionDelay)
      })

      waitsFor(() => {
        return provider.getSuggestions.calls.length === 1 && suggestionsPromise !== null
      })

      waitsForPromise(() => {
        return suggestionsPromise.then((s) => {
          suggestions = s
        })
      })

      runs(() => {
        expect(provider.getSuggestions).toHaveBeenCalled()
        expect(provider.getSuggestions.calls.length).toBe(1)
        expect(suggestions).toBeTruthy()
        expect(suggestions.length).toBeGreaterThan(0)
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
      runs(() => {
        expect(provider).toBeDefined()
        expect(provider.getSuggestions).not.toHaveBeenCalled()
        expect(editorView.querySelector('.autocomplete-plus')).not.toExist()
        editor.setCursorScreenPosition([13, 0])
        editor.insertText('\tSayHello("world")\t')
        suggestions = null
        suggestionsPromise = null
        advanceClock(completionDelay)
      })

      runs(() => {
        expect(provider.getSuggestions.calls.length).toBe(0)
        expect(suggestionsPromise).toBeFalsy()

        editor.insertText('.')
        advanceClock(completionDelay)
      })

      waitsFor(() => {
        return provider.getSuggestions.calls.length === 1 && suggestionsPromise !== null
      })

      waitsForPromise(() => {
        return suggestionsPromise.then((s) => {
          suggestions = s
        })
      })

      runs(() => {
        expect(provider.getSuggestions).toHaveBeenCalled()
        expect(provider.getSuggestions.calls.length).toBe(1)
        expect(suggestions).toBeTruthy()
        expect(suggestions.length).toBeGreaterThan(0)
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
