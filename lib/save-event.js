'use babel'

import {CompositeDisposable, Disposable} from 'atom'

export default class SaveEventOrchestrator {
  constructor () {
    this.subscriptions = new CompositeDisposable()
    this.willSaveCallbacks = new Set()
    this.didSaveCallbacks = new Set()

    this._subscribeToSaveEvents()
  }

  dispose () {
    this.subscriptions.dispose()
    this.subscriptions = null

    this.willSaveCallbacks = null
    this.didSaveCallbacks = null
  }

  // Register a callback to be invoked prior to an editor being saved.
  //
  // Callbacks should have the form:
  //     bool callback(editor)
  //
  // Callbacks will be invoked in the order they are registered.
  // Callbacks should return true to indicate success so that the
  // callback chain continue.  A non-true return value will prevent
  // subsequent callbacks from executing.
  //
  // Returns a disposable that can be used to unsubscribe the callback.
  onWillSave (callback) {
    if (typeof callback !== 'function') {
      throw new Error('callback must be a function')
    }
    this.willSaveCallbacks.add(callback)

    return new Disposable(() => {
      this.willSaveCallbacks.delete(callback)
    })
  }

  // Register a callback to be invoked after an editor is saved.
  //
  // Callbacks should have the form:
  //     bool callback(editor, path)
  //
  // Callbacks will be invoked in the order they are registered.
  // Callbacks should return true to indicate success so that the
  // callback chain continue.  A non-true return value will prevent
  // subsequent callbacks from executing.
  //
  // Returns a disposable that can be used to unsubscribe the callback.
  onDidSave (callback) {
    if (typeof callback !== 'function') {
      throw new Error('callback must be a function')
    }
    this.didSaveCallbacks.add(callback)

    return new Disposable(() => {
      this.didSaveCallbacks.delete(callback)
    })
  }

  _subscribeToSaveEvents () {
    this.subscriptions.add(atom.workspace.observeTextEditors((editor) => {
      if (!editor || !editor.getBuffer()) {
        return
      }
      // subscribe to buffer will-save events:
      const buffer = editor.getBuffer()
      const bufferWillSaveSubscription = buffer.onWillSave(() => {
        this._bufferWillSave(editor)
      })

      // subscribe to buffer did-save events:
      const editorDidSaveSubscription = editor.onDidSave((evt) => {
        this._editorDidSave(editor, evt.path)
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

  _bufferWillSave (editor) {
    for (const cb of this.willSaveCallbacks) {
      const succeeded = cb(editor)
      if (succeeded !== true) {
        break
      }
    }
  }

  _editorDidSave (editor, path) {
    for (const cb of this.didSaveCallbacks) {
      const succeeded = cb(editor, path)
      if (succeeded !== true) {
        break
      }
    }
  }
}
