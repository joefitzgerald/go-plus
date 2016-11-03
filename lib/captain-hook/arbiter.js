'use babel'

import {CompositeDisposable} from 'atom'
import {promiseWaterfall} from './../promise'

class Arbiter {
  constructor () {
    this.subscriptions = new CompositeDisposable()
    this.subscribeToSaveEvents()
  }

  dispose () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    if (this.saveSubscriptions) {
      this.saveSubscriptions.dispose()
    }
    this.saveSubscriptions = null
  }

  subscribeToSaveEvents () {
    if (this.saveSubscriptions) {
      this.saveSubscriptions.dispose()
    }
    this.saveSubscriptions = new CompositeDisposable()
    this.saveSubscriptions.add(atom.workspace.observeTextEditors((editor) => {
      if (!editor || !editor.getBuffer()) {
        return
      }

      let bufferSubscriptions = new CompositeDisposable()
      bufferSubscriptions.add(editor.getBuffer().onDidSave((filePath) => {
        let p = editor.getPath()
        if (filePath && filePath.path) {
          p = filePath.path
        }
        this.format(editor, this.tool, p)
      }))
      bufferSubscriptions.add(editor.getBuffer().onDidDestroy(() => {
        bufferSubscriptions.dispose()
        bufferSubscriptions = null
      }))
      this.saveSubscriptions.add(bufferSubscriptions)
    }))
  }

  cascade (editor) {
    if (!editor) {
      return Promise.resolve()
    }
    const formatters = []
    const builders = []
    const others = []
    const diagnostics = []
    for (const provider of this.formatters) {
      formatters.push(provider.format(editor))
    }
    promiseWaterfall(promises).then((results) => {
      let success = true
      for (const result of results) {
        if (!result.success) {
          success = false
        }

        if (result.diagnostics && result.diagnostics.length) {
          for (const m of iterable) {

          }
        }
      }
    })

    for (const provider of this.builders) {
      builders.push(provider.build(editor))
    }
    for (const provider of this.testers) {
      others.push(provider.test(editor))
    }
    for (const provider of this.diagnostics) {
      others.push(provider.diagnose(editor))
    }
  }

  registerFormatter (provider) {

  }

  registerBuilder (provider) {

  }

  registerTester (provider) {

  }

  registerDiagnostics (provider) {

  }
}
export {Arbiter}
