// @flow
'use babel'

import {CompositeDisposable} from 'atom'
import path from 'path'
import {getEditor, isValidEditor, projectPath} from '../utils'

import type {GoConfig} from './../config/service'

class Formatter {
  subscriptions: CompositeDisposable
  goconfig: GoConfig
  updatingFormatterCache: bool
  tool: string // 'gofmt' 'goimports', 'goreturns'
  formatterCache: Map<string, string>

  constructor (goconfig: GoConfig) {
    this.goconfig = goconfig
    this.subscriptions = new CompositeDisposable()
    this.updatingFormatterCache = false
    this.observeConfig()
    this.handleCommands()
    this.updateFormatterCache()
  }

  dispose () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    if (this.formatterCache) {
      this.formatterCache.clear()
    }
  }

  handleCommands () {
    atom.project.onDidChangePaths((projectPaths) => {
      this.updateFormatterCache()
    })
    this.subscriptions.add(atom.commands.add('atom-text-editor[data-grammar~="go"]', 'golang:gofmt', () => {
      if (!getEditor()) {
        return
      }
      this.format(getEditor(), 'gofmt')
    }))
    this.subscriptions.add(atom.commands.add('atom-text-editor[data-grammar~="go"]', 'golang:goimports', () => {
      if (!getEditor()) {
        return
      }
      this.format(getEditor(), 'goimports')
    }))
    this.subscriptions.add(atom.commands.add('atom-text-editor[data-grammar~="go"]', 'golang:goreturns', () => {
      if (!getEditor()) {
        return
      }
      this.format(getEditor(), 'goreturns')
    }))
  }

  observeConfig () {
    this.subscriptions.add(atom.config.observe('go-plus.format.tool', (formatTool) => {
      this.tool = formatTool
      this.updateFormatterCache()
    }))
  }

  handleWillSaveEvent (editor: any) {
    const format = atom.config.get('go-plus.format.formatOnSave')
    if (format) {
      this.format(editor, this.tool)
    }
    return true
  }

  ready () {
    return this.goconfig && !this.updatingFormatterCache && this.formatterCache && this.formatterCache.size > 0
  }

  resetFormatterCache () {
    this.formatterCache.clear()
  }

  async updateFormatterCache (): Promise<any> {
    if (this.updatingFormatterCache) {
      return Promise.resolve(false)
    }
    this.updatingFormatterCache = true

    if (!this.goconfig) {
      this.updatingFormatterCache = false
      return Promise.resolve(false)
    }

    const cache: Map<string, string> = new Map()
    const paths = atom.project.getPaths()
    paths.push(false)
    const promises = []
    for (const p of paths) {
      if (p && p.includes('://')) {
        continue
      }
      for (const tool of ['gofmt', 'goimports', 'goreturns']) {
        let key = tool + ':' + p
        if (!p) {
          key = tool
        }

        promises.push(this.goconfig.locator.findTool(tool).then((cmd) => {
          if (cmd) {
            cache.set(key, cmd)
            return cmd
          }
          return false
        }))
      }
    }

    try {
      await Promise.all(promises)
      this.formatterCache = cache
      this.updatingFormatterCache = false
      return this.formatterCache
    } catch (e) {
      if (e.handle) {
        e.handle()
      }
      console.log(e)
      this.updatingFormatterCache = false
    }
  }

  cachedToolPath (toolName: string, editor: any) {
    if (!this.formatterCache || !toolName) {
      return false
    }

    const p = projectPath()
    if (p) {
      const key = toolName + ':' + p
      const cmd = this.formatterCache.get(key)
      if (cmd) {
        return cmd
      }
    }

    const cmd = this.formatterCache.get(toolName)
    if (cmd) {
      return cmd
    }
    return false
  }

  format (editor: any = getEditor(), tool: string = this.tool, filePath?: string) {
    if (!isValidEditor(editor) || !editor.getBuffer()) {
      return
    }

    if (!filePath) {
      filePath = editor.getPath()
    }

    const formatCmd = this.cachedToolPath(tool, editor)
    if (!formatCmd) {
      this.updateFormatterCache()
      return
    }

    const options = this.goconfig.executor.getOptions('project')
    options.input = editor.getText()
    const args = ['-e']
    if (filePath) {
      if (tool === 'goimports') {
        args.push('--srcdir')
        args.push(path.dirname(filePath))
      }
    }

    const r = this.goconfig.executor.execSync(formatCmd, args, options)
    const stderr = r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr
    if (stderr && stderr.trim() !== '') {
      console.log('gofmt: (stderr) ' + stderr)
      return
    }
    if (r.exitcode === 0) {
      editor.getBuffer().setTextViaDiff(r.stdout)
    }
  }
}
export {Formatter}
