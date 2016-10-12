'use babel'

import {CompositeDisposable} from 'atom'
import path from 'path'

class Formatter {
  constructor (goconfigFunc, gogetFunc) {
    this.goget = gogetFunc
    this.goconfig = goconfigFunc
    this.subscriptions = new CompositeDisposable()
    this.saveSubscriptions = new CompositeDisposable()
    this.updatingFormatterCache = false
    this.setToolLocations()
    this.observeConfig()
    this.handleCommands()
    this.updateFormatterCache()
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
    this.goget = null
    this.goconfig = null
    this.formatTool = null
    this.toolCheckComplete = null
    this.formatterCache = null
    this.updatingFormatterCache = null
    this.toolLocations = null
  }

  setToolLocations () {
    this.toolLocations = {
      gofmt: false,
      goimports: 'golang.org/x/tools/cmd/goimports',
      goreturns: 'github.com/sqs/goreturns'
    }
  }

  handleCommands () {
    atom.project.onDidChangePaths((projectPaths) => {
      this.updateFormatterCache()
    })
    this.subscriptions.add(atom.commands.add('atom-text-editor[data-grammar~="go"]', 'golang:gofmt', () => {
      if (!this.ready() || !this.getEditor()) {
        return
      }
      this.format(this.getEditor(), 'gofmt')
    }))
    this.subscriptions.add(atom.commands.add('atom-text-editor[data-grammar~="go"]', 'golang:goimports', () => {
      if (!this.ready() || !this.getEditor()) {
        return
      }
      this.format(this.getEditor(), 'goimports')
    }))
    this.subscriptions.add(atom.commands.add('atom-text-editor[data-grammar~="go"]', 'golang:goreturns', () => {
      if (!this.ready() || !this.getEditor()) {
        return
      }
      this.format(this.getEditor(), 'goreturns')
    }))
  }

  observeConfig () {
    this.subscriptions.add(atom.config.observe('go-plus.formatTool', (formatTool) => {
      this.formatTool = formatTool
      if (this.toolCheckComplete) {
        this.toolCheckComplete[formatTool] = false
      }
      this.checkForTool(formatTool)
    }))
    this.subscriptions.add(atom.config.observe('go-plus.formatOnSave', (formatOnSave) => {
      if (this.saveSubscriptions) {
        this.saveSubscriptions.dispose()
      }
      this.saveSubscriptions = new CompositeDisposable()
      if (formatOnSave) {
        this.subscribeToSaveEvents()
      }
    }))
  }

  subscribeToSaveEvents () {
    debugger
    this.saveSubscriptions.add(atom.workspace.observeTextEditors((editor) => {
      if (!editor || !editor.getBuffer()) {
        return
      }

      let bufferSubscriptions = new CompositeDisposable()
      bufferSubscriptions.add(editor.getBuffer().onWillSave((filePath) => {
        let p = editor.getPath()
        if (filePath && filePath.path) {
          p = filePath.path
        }
        this.format(editor, this.formatTool, p)
      }))
      bufferSubscriptions.add(editor.getBuffer().onDidDestroy(() => {
        bufferSubscriptions.dispose()
      }))
      this.saveSubscriptions.add(bufferSubscriptions)
    }))
  }

  ready () {
    return this.goconfig && this.goconfig() && !this.updatingFormatterCache && this.formatterCache && this.formatterCache.size > 0
  }

  resetFormatterCache () {
    this.formatterCache = null
  }

  updateFormatterCache () {
    if (this.updatingFormatterCache) {
      return Promise.resolve(false)
    }
    this.updatingFormatterCache = true

    if (!this.goconfig || !this.goconfig()) {
      this.updatingFormatterCache = false
      return Promise.resolve(false)
    }

    let config = this.goconfig()
    let cache = new Map()
    let paths = atom.project.getPaths()
    paths.push(false)
    let promises = []
    for (let p of paths) {
      if (p && p.includes('://')) {
        continue
      }
      for (let tool of ['gofmt', 'goimports', 'goreturns']) {
        let key = tool + ':' + p
        let options = { directory: p }
        if (!p) {
          key = tool
          options = {}
        }

        promises.push(config.locator.findTool(tool, options).then((cmd) => {
          if (cmd) {
            cache.set(key, cmd)
            return cmd
          }
          return false
        }))
      }
    }
    return Promise.all(promises).then(() => {
      this.formatterCache = cache
      this.updatingFormatterCache = false
      return this.formatterCache
    }).catch((e) => {
      if (e.handle) {
        e.handle()
      }
      console.log(e)
      this.updatingFormatterCache = false
    })
  }

  cachedToolPath (toolName, editor) {
    if (!this.formatterCache || !toolName) {
      return false
    }

    let p = this.projectPath(editor)
    if (p) {
      let key = toolName + ':' + p
      let cmd = this.formatterCache.get(key)
      if (cmd) {
        return cmd
      }
    }

    let cmd = this.formatterCache.get(toolName)
    if (cmd) {
      return cmd
    }
    return false
  }

  projectPath (editor) {
    if (editor) {
      let result = atom.project.relativizePath(editor.getPath())
      if (result && result.projectPath) {
        return result.projectPath
      }
    }
    let paths = atom.project.getPaths()
    if (paths && paths.length) {
      for (let p of paths) {
        if (p && !p.includes('://')) {
          return p
        }
      }
    }

    return false
  }

  checkForTool (toolName = this.formatTool, options = this.getLocatorOptions()) {
    if (!this.ready()) {
      return
    }
    let config = this.goconfig()
    return config.locator.findTool(toolName, options).then((cmd) => {
      if (cmd) {
        return this.updateFormatterCache().then(() => {
          return cmd
        })
      }

      if (!this.toolCheckComplete) {
        this.toolCheckComplete = { }
      }

      if (!cmd && !this.toolCheckComplete[toolName]) {
        let goget = this.goget()
        if (!goget) {
          return false
        }
        this.toolCheckComplete[toolName] = true

        let packagePath = this.toolLocations[toolName]
        if (packagePath) {
          goget.get({
            name: 'gofmt',
            packageName: toolName,
            packagePath: packagePath,
            type: 'missing'
          }).then(() => {
            return this.updateFormatterCache()
          }).catch((e) => {
            console.log(e)
          })
        }
      }

      return false
    })
  }

  getEditor () {
    if (!atom || !atom.workspace) {
      return
    }
    let editor = atom.workspace.getActiveTextEditor()
    if (!this.isValidEditor(editor)) {
      return
    }

    return editor
  }

  isValidEditor (editor) {
    if (!editor || !editor.getGrammar()) {
      return false
    }

    return editor.getGrammar().scopeName === 'source.go'
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
    if (o.directory) {
      options.cwd = o.directory
    }
    let config = this.goconfig()
    if (config) {
      options.env = config.environment(o)
    }
    if (!options.env) {
      options.env = process.env
    }
    return options
  }

  format (editor = this.getEditor(), tool = this.formatTool, filePath) {
    if (!this.ready() || !this.isValidEditor(editor) || !editor.getBuffer()) {
      return
    }

    if (!filePath) {
      filePath = editor.getPath()
    }

    let formatCmd = this.cachedToolPath(tool, editor)
    if (!formatCmd) {
      this.checkForTool(tool)
      return
    }

    let cmd = formatCmd
    let config = this.goconfig()
    let options = this.getExecutorOptions(editor)
    options.input = editor.getText()
    let args = ['-e']
    if (filePath) {
      if (tool === 'goimports') {
        args.push('--srcdir')
        args.push(path.dirname(filePath))
      }
    }

    let r = config.executor.execSync(cmd, args, options)
    if (r.stderr && r.stderr.trim() !== '') {
      console.log('gofmt: (stderr) ' + r.stderr)
      return
    }
    if (r.exitcode === 0) {
      editor.getBuffer().setTextViaDiff(r.stdout)
    }
  }
}
export {Formatter}
