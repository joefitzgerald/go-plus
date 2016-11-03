'use babel'

import {CompositeDisposable} from 'atom'
import path from 'path'

class Formatter {
  constructor (goconfig) {
    this.goconfig = goconfig
    this.subscriptions = new CompositeDisposable()
    this.saveSubscriptions = new CompositeDisposable()
    this.observeConfig()
    this.handleCommands()
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
    this.goconfig = null
    this.tool = null
  }

  handleCommands () {
    this.subscriptions.add(atom.commands.add('atom-text-editor[data-grammar~="go"]', 'golang:gofmt', () => {
      if (!this.getEditor()) {
        return
      }
      this.format(this.getEditor(), 'gofmt')
    }))
    this.subscriptions.add(atom.commands.add('atom-text-editor[data-grammar~="go"]', 'golang:goimports', () => {
      if (!this.getEditor()) {
        return
      }
      this.format(this.getEditor(), 'goimports')
    }))
    this.subscriptions.add(atom.commands.add('atom-text-editor[data-grammar~="go"]', 'golang:goreturns', () => {
      if (!this.getEditor()) {
        return
      }
      this.format(this.getEditor(), 'goreturns')
    }))
  }

  observeConfig () {
    this.subscriptions.add(atom.config.observe('go-plus.format.tool', (formatTool) => {
      this.tool = formatTool
    }))
    this.subscriptions.add(atom.config.observe('go-plus.format.formatOnSave', (formatOnSave) => {
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
        this.format(editor, this.tool, p)
      }))
      bufferSubscriptions.add(editor.getBuffer().onDidDestroy(() => {
        bufferSubscriptions.dispose()
      }))
      this.saveSubscriptions.add(bufferSubscriptions)
    }))
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

  checkForTool (toolName = this.tool, options = this.getLocatorOptions()) {
    return this.goconfig.locator.findTool(toolName, options).then((cmd) => {
      if (cmd) {
        return cmd
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

    if (this.goconfig) {
      options.env = this.goconfig.environment(o)
    }
    if (!options.env) {
      options.env = process.env
    }
    return options
  }

  format (editor = this.getEditor(), tool = this.tool, filePath) {
    if (!this.isValidEditor(editor) || !editor.getBuffer()) {
      return
    }

    if (!filePath) {
      filePath = editor.getPath()
    }
    let formatCmd
    if (!formatCmd) {
      this.checkForTool(tool)
      return
    }

    let cmd = formatCmd
    let options = this.getExecutorOptions(editor)
    options.input = editor.getText()
    let args = ['-e']
    if (filePath) {
      if (tool === 'goimports') {
        args.push('--srcdir')
        args.push(path.dirname(filePath))
      }
    }

    let r = this.goconfig.executor.execSync(cmd, args, options)
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
