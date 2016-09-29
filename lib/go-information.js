'use babel'

import {CompositeDisposable} from 'atom'
import os from 'os'
import path from 'path'

class GoInformation {
  constructor (goconfigFunc) {
    this.subscriptions = new CompositeDisposable()
    this.goconfig = goconfigFunc
    this.key = 'go'
  }

  dispose () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    this.goconfig = null
  }

  getEditor () {
    if (!atom || !atom.workspace) {
      return
    }
    return atom.workspace.getActiveTextEditor()
  }

  projectPath (editor) {
    if (editor && editor.getPath()) {
      return path.dirname(editor.getPath())
    }

    if (atom.project.getPaths().length) {
      return atom.project.getPaths()[0]
    }

    return false
  }

  getLocatorOptions (editor = this.getEditor()) {
    let options = {}
    let p = this.projectPath(editor)
    if (p) {
      options.directory = p
    }

    return options
  }

  getExecutorOptions (editor = this.getEditor()) {
    let o = this.getLocatorOptions(editor)
    let options = {}
    options.cwd = path.dirname(this.projectPath(editor))
    let config = this.goconfig()
    if (config) {
      options.env = config.environment(o)
    }
    if (!options.env) {
      options.env = process.env
    }
    return options
  }

  updateContent (editor = this.getEditor()) {
    if (!this.view) {
      return
    }

    if (!this.goconfig || !this.goconfig()) {
      this.view.update({content: 'Ensure the go-config package is installed and activated to see this information.'})
      return
    }

    let config = this.goconfig()
    let locatorOptions = this.getLocatorOptions(editor)
    let content = ''
    return config.locator.findTool('go', locatorOptions).then((go) => {
      if (!go) {
        return
      }

      let cmd = go
      let args = ['version']
      let executorOptions = this.getExecutorOptions(editor)
      return config.executor.exec(cmd, args, executorOptions).then((r) => {
        content = `$ ${cmd} version` + os.EOL
        if (r.stderr && r.stderr.trim() !== '') {
          content = content + r.stderr.trim()
        }
        if (r.stdout && r.stdout.trim() !== '') {
          content = content + r.stdout.trim()
        }
        content = content + os.EOL + os.EOL
        args = ['env']
        return config.executor.exec(cmd, args, executorOptions)
      }).then((r) => {
        content = content + `$ ${cmd} env` + os.EOL
        if (r.stderr && r.stderr.trim() !== '') {
          content = content + r.stderr.trim()
        }
        if (r.stdout && r.stdout.trim() !== '') {
          content = content + r.stdout.trim()
        }
      }).then((r) => {
        this.view.update({content: content})
      })
    }).catch((e) => {
      if (e.handle) {
        e.handle()
      }
      console.log(e)
      this.running = false
      return Promise.resolve()
    })
  }
}
export {GoInformation}
