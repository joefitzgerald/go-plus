// @flow

import { CompositeDisposable } from 'atom'
import { isValidEditor } from './utils'

const workspaceCommands = [
  'golang:get-package',
  'golang:update-tools',
  'golang:toggle-panel',
  'golang:showdoc'
]

const editorCommands = [
  'golang:run-tests',
  'golang:hide-coverage',
  'golang:gorename'
]

class Bootstrap {
  onActivated: ?() => void
  subscriptions: CompositeDisposable
  grammarUsed: boolean
  commandUsed: boolean
  environmentLoaded: boolean
  activated: boolean

  constructor(onActivated: () => void) {
    this.onActivated = onActivated
    this.subscriptions = new CompositeDisposable()
    this.grammarUsed = false
    this.commandUsed = false
    this.environmentLoaded = false
    this.activated = false
    this.subscribeToCommands()
    this.subscribeToEvents()
  }

  subscribeToCommands() {
    for (const command of workspaceCommands) {
      this.subscriptions.add(
        atom.commands.add('atom-workspace', command, () => {
          this.setCommandUsed()
        })
      )
    }

    for (const command of editorCommands) {
      this.subscriptions.add(
        atom.commands.add(
          'atom-text-editor[data-grammar~="go"]',
          command,
          () => {
            this.setCommandUsed()
          }
        )
      )
    }
  }

  subscribeToEvents() {
    this.subscriptions.add(
      atom.packages.onDidTriggerActivationHook(
        'core:loaded-shell-environment',
        () => {
          this.setEnvironmentLoaded()
        }
      )
    )

    if (atom.packages) {
      const hooks: any = (atom.packages: any).triggeredActivationHooks
      if (hooks && hooks.has('core:loaded-shell-environment')) {
        this.setEnvironmentLoaded()
      }
    }
    this.subscriptions.add(
      atom.packages.onDidTriggerActivationHook(
        'language-go:grammar-used',
        () => {
          this.setGrammarUsed()
        }
      )
    )
    this.subscriptions.add(
      atom.workspace.observeTextEditors(editor => {
        if (isValidEditor(editor)) {
          this.setGrammarUsed()
        }
      })
    )
  }

  setEnvironmentLoaded() {
    this.environmentLoaded = true
    this.check()
  }

  setGrammarUsed() {
    this.grammarUsed = true
    this.check()
  }

  setCommandUsed() {
    this.commandUsed = true
    this.check()
  }

  check() {
    if (this.activated) {
      return
    }

    if (this.environmentLoaded && (this.grammarUsed || this.commandUsed)) {
      this.activated = true
      this.subscriptions.dispose()
      if (this.onActivated) {
        this.onActivated()
      }
    }
  }

  dispose() {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.onActivated = null
    this.grammarUsed = false
    this.commandUsed = false
    this.environmentLoaded = false
    this.activated = false
  }
}

export { Bootstrap }
