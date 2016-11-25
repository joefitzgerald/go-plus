'use babel'

import {CompositeDisposable} from 'atom'
import os from 'os'
import path from 'path'

class Information {
  constructor (goconfig) {
    this.subscriptions = new CompositeDisposable()
    this.goconfig = goconfig
    this.key = 'go'
    this.tab = {
      name: 'Go',
      packageName: 'go-plus',
      icon: 'info',
      order: 100
    }
    this.active = false
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
    const options = {}
    const p = this.projectPath(editor)
    if (p) {
      options.directory = p
    }

    return options
  }

  getExecutorOptions (editor = this.getEditor()) {
    const o = this.getLocatorOptions(editor)
    const options = {}
    const p = this.projectPath(editor)
    if (p) {
      options.cwd = path.dirname(p)
    }

    if (this.goconfig) {
      options.env = this.goconfig.environment(o)
    }
    if (!options.env) {
      options.env = process.env
    }
    return options
  }

  isActive (active) {
    this.active = active
  }

  setOrientation (orientation) {
    this.orientation = orientation
  }

  updateContent (editor = this.getEditor()) {
    if (!this.active || !this.view) {
      return
    }

    const locatorOptions = this.getLocatorOptions(editor)
    let content = ''
    return this.goconfig.locator.findTool('go', locatorOptions).then((go) => {
      if (!go) {
        return
      }

      const cmd = go
      let args = ['version']
      const executorOptions = this.getExecutorOptions(editor)
      if (!this.goconfig) {
        return
      }
      return this.goconfig.executor.exec(cmd, args, executorOptions).then((r) => {
        content = `$ ${cmd} version` + os.EOL
        if (r.stderr && r.stderr.trim() !== '') {
          content = content + r.stderr.trim()
        }
        if (r.stdout && r.stdout.trim() !== '') {
          content = content + r.stdout.trim()
        }
        content = content + os.EOL + os.EOL
        args = ['env']
        if (!this.goconfig) {
          return
        }
        return this.goconfig.executor.exec(cmd, args, executorOptions)
      }).then((r) => {
        if (!r) {
          return
        }
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
export {Information}
