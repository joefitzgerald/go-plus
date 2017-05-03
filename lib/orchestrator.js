'use babel'

import {CompositeDisposable, Disposable} from 'atom'
import {isValidEditor} from './utils'

export default class Orchestrator {
  constructor () {
    this.subscriptions = new CompositeDisposable()
    this.willSaveCallbacks = new Set()
    this.didSaveCallbacks = new Map()
    this.subscribeToEvents()
  }

  dispose () {
    this.subscriptions.dispose()
    this.subscriptions = null

    this.willSaveCallbacks = null
    this.didSaveCallbacks = null
  }

  // Register a task to be run by the orchestrator at the appropriate time.
  //
  // Type should be one of 'willSave' or 'didSave'; didSave is the default. The
  // distinction is only present to allow formatting to occur at the appropriate
  // time.
  //
  // willSave callbacks:
  //     These callbacks are invoked synchronously in the order they are registered.
  //     They should have the form `bool callback(editor)`, and should return true
  //     to indicate success so that the callback chain can continue.  A non-true
  //     return value will prevent subsequent callbacks from executing.
  //
  // didSave callbacks:
  //     These callbacks should have the form `Promise callback(editor, path)`.
  //     The resulting promise should resolve to indicate success so that the chain
  //     can continue.  A promise that is rejected will prevent future callbacks
  //     from executing.
  //
  // Register returns a disposable that can be used to unsubscribe the callback.
  register (name, callback, type = 'didSave') {
    if (typeof callback !== 'function') {
      throw new Error('callback must be a function')
    }
    if (type !== 'didSave' && type !== 'willSave') {
      throw new Error('type must be a willSave or didSave')
    }
    if (type === 'willSave') {
      this.willSaveCallbacks.add(callback)
      return new Disposable(() => {
        if (this.willSaveCallbacks) {
          this.willSaveCallbacks.delete(callback)
        }
      })
    }

    this.didSaveCallbacks.set(name, callback)
    return new Disposable(() => {
      if (this.didSaveCallbacks) {
        this.didSaveCallbacks.delete(name)
      }
    })
  }

  subscribeToEvents () {
    this.subscriptions.add(atom.workspace.observeTextEditors((editor) => {
      if (!isValidEditor(editor)) {
        return
      }
      // subscribe to buffer will-save events:
      const buffer = editor.getBuffer()
      const bufferWillSaveSubscription = buffer.onWillSave(() => {
        this.bufferWillSave(editor)
      })

      // subscribe to buffer did-save events:
      const editorDidSaveSubscription = editor.onDidSave((evt) => {
        this.editorDidSave(editor, evt.path).then(() => {}, (error) => {
          console.log(error)
        })
      })

      // subscribe to editor destroyed events:
      const editorDestroySubscription = editor.onDidDestroy(() => {
        bufferWillSaveSubscription.dispose()
        editorDestroySubscription.dispose()
        editorDidSaveSubscription.dispose()
        this.subscriptions.remove(bufferWillSaveSubscription)
        this.subscriptions.remove(editorDidSaveSubscription)
        this.subscriptions.remove(editorDestroySubscription)
      })

      // add all subscriptions
      this.subscriptions.add(bufferWillSaveSubscription)
      this.subscriptions.add(editorDidSaveSubscription)
      this.subscriptions.add(editorDestroySubscription)
    }))
  }

  bufferWillSave (editor) {
    for (const cb of this.willSaveCallbacks) {
      const succeeded = cb(editor)
      if (succeeded !== true) {
        break
      }
    }
  }

  editorDidSave (editor, path) {
    return Array.from(this.didSaveCallbacks.entries()).reduce((p, [name, cb]) => {
      return p.then(() => {
        return cb(editor, path)
      })
    }, Promise.resolve())
  }
}
