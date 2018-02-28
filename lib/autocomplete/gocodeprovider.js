// @flow
'use babel'

import {CompositeDisposable} from 'atom'
import {filter} from 'fuzzaldrin-plus'
import _ from 'lodash'
import os from 'os'
import {isValidEditor} from '../utils'
import {allPackages, isVendorSupported} from '../go'
import {wantedPackage, getPackage, addImport} from './gocodeprovider-helper'
import {toSuggestions} from './suggestions'

import type {GoConfig} from '../config/service'
import type {AutocompleteProvider, Suggestion, SuggestionRequest} from './provider'
import type {ExecutorOptions} from '../config/executor'

export type SnippetMode = 'name' | 'nameAndType' | 'none'

export type GoCodeSuggestion = {|
  class: 'func' | 'package' | 'var' | 'type' | 'const' | 'PANIC',
  name: string,
  type: string
|}

type RawGoCodeSuggestion = [number, GoCodeSuggestion[]]
type EmptyRawGoCodeSuggestion = [] | RawGoCodeSuggestion

class GocodeProvider implements AutocompleteProvider {
  goconfig: GoConfig
  subscriptions: CompositeDisposable
  subscribers: Array<(Promise<any>) => void>
  currentSuggestions: Array<Suggestion>
  proposeBuiltins: bool
  unimportedPackages: bool
  selector: string
  inclusionPriority: number
  panicked: bool
  currentFile: string
  currentRow: number
  currentColumn: number
  excludeLowerPriority: bool
  suppressForCharacters: Array<string>
  snippetMode: SnippetMode
  shouldSuppressStringQuoted: bool
  disableForSelector: string
  allPkgs: Map<string, string[]>

  constructor (goconfig: GoConfig) {
    this.goconfig = goconfig
    this.subscriptions = new CompositeDisposable()
    this.subscribers = []
    this.currentSuggestions = []
    this.currentFile = ''
    this.currentRow = -1
    this.currentColumn = -1

    this.proposeBuiltins = true
    this.unimportedPackages = true
    this.selector = '.source.go, go source_file'
    this.inclusionPriority = 1
    this.excludeLowerPriority = atom.config.get('go-plus.autocomplete.suppressBuiltinAutocompleteProvider')
    this.suppressForCharacters = []
    this.filterSelectors()
    const suppressSubscription = atom.config.observe('go-plus.autocomplete.suppressActivationForCharacters', (value) => {
      this.suppressForCharacters = _.map(value, (c) => {
        let char = c ? c.trim() : ''
        char = (() => {
          switch (false) {
            case char.toLowerCase() !== 'comma':
              return ','
            case char.toLowerCase() !== 'newline':
              return '\n'
            case char.toLowerCase() !== 'space':
              return ' '
            case char.toLowerCase() !== 'tab':
              return '\t'
            default:
              return char
          }
        })()
        return char
      })
      this.suppressForCharacters = _.compact(this.suppressForCharacters)
    })
    this.subscriptions.add(suppressSubscription)
    const snippetModeSubscription = atom.config.observe('go-plus.autocomplete.snippetMode', (value) => {
      this.snippetMode = value
    })
    this.subscriptions.add(snippetModeSubscription)
    this.subscriptions.add(atom.config.observe('go-plus.autocomplete.proposeBuiltins', (value) => {
      this.proposeBuiltins = value
      this.toggleGocodeConfig()
    }))
    this.subscriptions.add(atom.config.observe('go-plus.autocomplete.unimportedPackages', (value) => {
      this.unimportedPackages = value
      this.toggleGocodeConfig()
    }))

    this.allPkgs = allPackages(this.goconfig)
  }

  dispose () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    this.subscribers = []
    this.resetCache()
  }

  toggleGocodeConfig () {
    if (this.goconfig) {
      this.goconfig.locator.findTool('gocode').then((cmd) => {
        if (!cmd) {
          return
        }
        const gocode = cmd
        const opt = this.goconfig.executor.getOptions('file')
        this.goconfig.executor.exec(gocode, ['set', 'unimported-packages', this.unimportedPackages.toString()], opt).then((r) => {
          const stderr = r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr
          if (stderr && stderr.trim() !== '') {
            console.log('autocomplete-go: (stderr) ' + stderr)
          }
        }).then(() => {
          if (!this.goconfig) {
            return
          }
          return this.goconfig.executor.exec(gocode, ['set', 'propose-builtins', this.proposeBuiltins.toString()], opt).then((r) => {
            const stderr = r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr
            if (stderr && stderr.trim() !== '') {
              console.log('autocomplete-go: (stderr) ' + stderr)
            }
          })
        })
      }).catch((e) => {
        console.log(e)
      })
    }
  }

  filterSelectors () {
    const configSelectors = atom.config.get('go-plus.autocomplete.scopeBlacklist')
    this.shouldSuppressStringQuoted = false
    const selectors = []
    if (configSelectors && configSelectors.length) {
      for (let selector of configSelectors.split(',')) {
        selector = selector.trim()
        if (selector.includes('.string.quoted')) {
          this.shouldSuppressStringQuoted = true
        } else {
          selectors.push(selector)
        }
      }
    }
    this.disableForSelector = selectors.join(', ')
  }

  ready () {
    return !!this.goconfig
  }

  characterIsSuppressed (char: string, scopeDescriptor: {scopes: Array<string>}): bool {
    if (scopeDescriptor && scopeDescriptor.scopes && scopeDescriptor.scopes.length > 0) {
      for (const scope of scopeDescriptor.scopes) {
        if (scope === 'entity.name.import.go') {
          return false
        }

        if (this.shouldSuppressStringQuoted && scope && scope.startsWith('string.quoted')) {
          return scopeDescriptor.scopes.indexOf('entity.name.import.go') === -1
        }
      }
    }
    return this.suppressForCharacters.indexOf(char) !== -1
  }

  resetCache () {
    this.currentSuggestions = []
    this.currentFile = ''
    this.currentRow = -1
    this.currentColumn = -1
  }

  getSuggestions (options: SuggestionRequest): Promise<Array<Suggestion>> {
    // only invoke gocode when a new word starts or the '.' char is entered
    // on all other keystrokes we just fuzzy filter the previous set of suggestions
    let {prefix, bufferPosition, editor} = options
    prefix = prefix.trim()
    if (prefix === '') {
      if (!options.activatedManually) {
        this.resetCache()
        const p = Promise.resolve([])
        this.notifySubscribers(p)
        return p
      }
    }

    const sameFile = this.currentFile === editor.getPath()
    const sameLine = this.currentRow >= 0 && this.currentRow === bufferPosition.row
    const movingForward = this.currentColumn >= 0 && this.currentColumn <= bufferPosition.column
    let useCache = !options.activatedManually && sameFile && sameLine && movingForward

    if (useCache && this.currentSuggestions.length && prefix.length > 0) {
      const last = prefix.slice(-1)
      const nonWordChars = editor.getNonWordCharacters()
      useCache = last !== '.' && !nonWordChars.includes(prefix)
      if (!useCache) {
        // it's a non word char like .()[]{}
        // so we cannot reuse the previous suggestions
        this.resetCache()
      }
    }

    if (useCache) {
      // fuzzy filter on this.currentSuggestions
      const p = new Promise((resolve) => {
        const fil = filter(this.currentSuggestions, prefix, {key: 'fuzzyMatch'})
          .map(s => Object.assign({}, s, {replacementPrefix: prefix}))
        this.currentFile = editor.getPath()
        this.currentRow = bufferPosition.row
        this.currentColumn = bufferPosition.column
        resolve(fil)
      })
      this.notifySubscribers(p)
      return p
    }

    // get a fresh set of suggestions from gocode
    const p: Promise<Array<Suggestion>> = new Promise((resolve) => {
      if (!options || !this.ready() || !isValidEditor(editor)) {
        resolve([])
        return
      }

      const buffer = editor.getBuffer()
      if (!buffer || !bufferPosition) {
        resolve([])
        return
      }

      const index = buffer.characterIndexForPosition(bufferPosition)
      const priorBufferPosition = bufferPosition.copy()
      if (priorBufferPosition.column > 0) {
        priorBufferPosition.column = priorBufferPosition.column - 1
      }
      const scopeDescriptor = editor.scopeDescriptorForBufferPosition(priorBufferPosition)
      const text = editor.getText()
      if (!options.activatedManually && index > 0 && this.characterIsSuppressed(text[index - 1], scopeDescriptor)) {
        resolve([])
        return
      }
      const offset = Buffer.byteLength(text.substring(0, index), 'utf8')

      this.goconfig.locator.findTool('gocode').then((cmd) => {
        if (!cmd) {
          resolve([])
          return
        }
        const file = buffer.getPath()
        const args = ['-f=json', 'autocomplete', file, offset.toString()]
        const execOptions = this.goconfig.executor.getOptions('file', editor)
        execOptions.input = text

        this.executeGocode(cmd, args, execOptions)
          .then((rawSuggestions: EmptyRawGoCodeSuggestion): EmptyRawGoCodeSuggestion | Promise<EmptyRawGoCodeSuggestion> => {
            if (rawSuggestions.length === 0 && prefix === '.') {
              return isVendorSupported(this.goconfig).then((useVendor: boolean): EmptyRawGoCodeSuggestion | Promise<EmptyRawGoCodeSuggestion> => {
                const pkg = wantedPackage(buffer, bufferPosition)
                if (!pkg) {
                  return []
                }
                const pkgs = this.allPkgs.get(pkg)
                if (!pkgs || !pkgs.length) {
                  return []
                }
                const {GOPATH} = this.goconfig.environment()
                const pkgPath = getPackage(file, GOPATH, pkgs, useVendor)
                if (!pkgPath) {
                  return []
                }
                const added = addImport(buffer, pkgPath, offset)
                if (!added) {
                  return []
                }
                const args = ['-f=json', 'autocomplete', file, added.offset.toString()]
                const execOptions = this.goconfig.executor.getOptions('file', editor)
                execOptions.input = added.text
                if (cmd) {
                  return this.executeGocode(cmd, args, execOptions)
                }
                return []
              })
            }
            return rawSuggestions
          })
          .then((rawSuggestions: EmptyRawGoCodeSuggestion) => {
            let suggestions: Suggestion[] = []
            if (rawSuggestions.length > 0) {
              suggestions = this.mapMessages((rawSuggestions: any), editor, bufferPosition)
            }
            this.currentSuggestions = suggestions
            this.currentFile = editor.getPath()
            this.currentRow = bufferPosition.row
            this.currentColumn = bufferPosition.column
            resolve(suggestions)
          })
      })
    })

    this.notifySubscribers(p)
    return p
  }

  executeGocode (cmd: string, args: string[], options: ExecutorOptions): Promise<EmptyRawGoCodeSuggestion> {
    return this.goconfig.executor.exec(cmd, args, options).then((r) => {
      const stderr = r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr
      if (stderr && stderr.trim() !== '') {
        console.log('go-plus: Failed to run gocode:', r.stderr)
      }
      const data = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
      if (!data || !data.trim()) {
        return []
      }
      try {
        return JSON.parse(data)
      } catch (e) {
        if (e && e.handle) {
          e.handle()
        }
        atom.notifications.addError('gocode error', {
          detail: r.stdout,
          dismissable: true
        })
        console.log('go-plus: Failed to parse the output of gocode:', e)
        return []
      }
    }).catch((e) => {
      console.log(e)
      return []
    })
  }

  notifySubscribers (p: Promise<Array<Suggestion>>) {
    if (this.subscribers && this.subscribers.length > 0) {
      for (const subscriber of this.subscribers) {
        subscriber(p)
      }
    }
  }

  onDidGetSuggestions (s: (Promise<any>) => void) {
    if (this.subscribers) {
      this.subscribers.push(s)
    }
  }

  mapMessages (res: RawGoCodeSuggestion, editor: any, position: any): Array<Suggestion> {
    const candidates: GoCodeSuggestion[] = res[1]
    if (!candidates || !candidates.length) {
      return []
    }
    if (candidates[0] && candidates[0].class === 'PANIC' && candidates[0].type === 'PANIC' && candidates[0].name === 'PANIC') {
      this.bounceGocode()
    }
    const numPrefix: number = res[0]
    const prefix = editor.getTextInBufferRange([[position.row, position.column - numPrefix], position])
    let suffix = ''
    try {
      suffix = editor.getTextInBufferRange([position, [position.row, position.column + 1]])
    } catch (e) {
      console.log(e)
    }
    return toSuggestions(candidates, { prefix, suffix, snippetMode: this.snippetMode })
  }

  bounceGocode () {
    if (this.panicked) {
      return
    }

    this.panicked = true
    const notification = atom.notifications.addError('gocode', {
      dismissable: true,
      icon: 'flame',
      detail: 'gocode is panicking',
      description: 'This often happens when you install a new go version, or when you are running an out of date version of `gocode`.' + os.EOL + os.EOL + 'See the <a href="https://github.com/joefitzgerald/go-plus/wiki/FAQ#help-the-only-autocomplete-suggestion-that-i-am-receiving-is-panic">FAQ</a> for more information.' + os.EOL + os.EOL + 'Often, running `gocode close && go get -u github.com/nsf/gocode` is able to fix the issue.' + os.EOL + os.EOL + 'If this does not work and you are definitely running the latest version of `gocode`, you might want to search for open issues at <a href="https://github.com/nsf/gocode/issues?utf8=%E2%9C%93&q=is%3Aissue%20is%3Aopen%20panic">https://github.com/nsf/gocode/issues</a>.' + os.EOL + os.EOL + 'Would you like to try running `gocode close && go get -u github.com/nsf/gocode` now?',
      buttons: [{
        text: 'Yes',
        onDidClick: () => {
          notification.dismiss()
          atom.commands.dispatch(atom.views.getView(atom.workspace), 'golang:update-tools', ['github.com/nsf/gocode'])
        }
      }, {
        text: 'Not Now',
        onDidClick: () => {
          notification.dismiss()
        }
      }]
    })
  }
}
export {GocodeProvider}
