// @flow

import { CompositeDisposable } from 'atom'
import path from 'path'
import { projectPath } from '../utils'

import type { GoConfig } from './../config/service'

class Formatter {
  subscriptions: CompositeDisposable
  goconfig: GoConfig
  tool: string // 'gofmt' 'goimports', 'goreturns'
  formatterCache: Map<string, string>
  updatingFormatterCache: boolean
  priority: number = 2
  grammarScopes: Array<string> = ['source.go', 'go']

  constructor(goconfig: GoConfig) {
    this.goconfig = goconfig
    this.subscriptions = new CompositeDisposable()
    this.updatingFormatterCache = false
    atom.project.onDidChangePaths(() => this.updateFormatterCache())
    this.observeConfig()
    this.updateFormatterCache()
  }

  dispose() {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    if (this.formatterCache) {
      this.formatterCache.clear()
    }
  }

  async formatEntireFile(
    editor: atom$TextEditor,
    range: atom$Range // eslint-disable-line no-unused-vars
  ): Promise<?{
    newCursor?: number,
    formatted: string
  }> {
    const tool = this.tool
    let cmd = this.cachedToolPath(tool)
    if (!cmd) {
      await this.updateFormatterCache()
      cmd = this.cachedToolPath(tool)
    }
    if (!cmd) {
      console.log('skipping format, could not find tool', tool) // eslint-disable-line no-console
      return null
    }
    const options = this.goconfig.executor.getOptions('project', editor)
    options.input = editor.getText()
    const args = []
    if (tool === 'goimports') {
      const p = editor.getPath()
      if (p) {
        args.push('--srcdir')
        args.push(path.dirname(p))
      }
    }
    const r = await this.goconfig.executor.exec(cmd, args, options)
    if (r.exitcode !== 0) return null
    const out = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
    return { formatted: out }
  }

  observeConfig() {
    this.subscriptions.add(
      atom.config.observe('go-plus.format.tool', formatTool => {
        this.tool = formatTool
        this.updateFormatterCache()
      })
    )
  }

  resetFormatterCache() {
    this.formatterCache.clear()
  }

  async updateFormatterCache(): Promise<any> {
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

        promises.push(
          this.goconfig.locator.findTool(tool).then(cmd => {
            if (cmd) {
              cache.set(key, cmd)
              return cmd
            }
            return false
          })
        )
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
      console.log(e) // eslint-disable-line no-console
      this.updatingFormatterCache = false
    }
  }

  cachedToolPath(toolName: string) {
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

    return this.formatterCache.get(toolName) || false
  }
}
export { Formatter }
