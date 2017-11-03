// @flow
'use babel'

import {CompositeDisposable} from 'atom'

import type {GoConfig} from './config/service'

class ToolChecker {
  goconfig: GoConfig
  subscriptions: CompositeDisposable

  constructor (goconfig: GoConfig) {
    this.goconfig = goconfig
    this.subscriptions = new CompositeDisposable()
  }

  dispose () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
  }

  checkForTools (tools: Array<string>) {
    if (!tools || !tools.length) {
      return
    }
    let shouldUpdateTools = false
    const promises = []
    for (const tool of tools) {
      if (!tool) {
        continue
      }
      promises.push(this.goconfig.locator.findTool(tool).then((cmd) => {
        if (!cmd) {
          shouldUpdateTools = true
        }
      }))
    }
    Promise.all(promises).then(() => {
      if (!shouldUpdateTools) {
        return
      }

      atom.commands.dispatch(atom.views.getView(atom.workspace), 'golang:update-tools')
    })
  }
}

export {ToolChecker}
