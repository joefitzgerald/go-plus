'use babel'

import path from 'path'
import {CompositeDisposable, Point} from 'atom'
import GodocPanel from './godoc-panel'
import {isValidEditor} from '../utils'

class Godoc {
  constructor (goconfig, goget) {
    this.goconfig = goconfig
    this.goget = goget
    this.subscriptions = new CompositeDisposable()
    this.panelModel = new GodocPanel()
    this.subscriptions.add(this.panelModel)
    this.subscriptions.add(atom.commands.add(
      'atom-text-editor', 'golang:showdoc',
      () => this.commandInvoked()))
  }

  commandInvoked () {
    const editor = atom.workspace.getActiveTextEditor()
    if (!isValidEditor(editor)) {
      return
    }

    return this.checkForTool(editor).then((cmd) => {
      if (!cmd) {
        // TODO: notification?
        return {success: false, result: null}
      }
      const file = editor.getBuffer().getPath()
      const cwd = path.dirname(file)
      const offset = this.editorByteOffset(editor)

      // package up unsaved buffers in the Guru archive format
      let archive = ''
      for (const e of atom.workspace.getTextEditors()) {
        if (e.isModified() && isValidEditor(e)) {
          archive += e.getTitle() + '\n'
          archive += Buffer.byteLength(e.getText(), 'utf8') + '\n'
          archive += e.getText()
        }
      }
      return this.getDoc(file, offset, cwd, cmd, archive)
    })
  }

  checkForTool (editor) {
    if (!this.goconfig) {
      return Promise.resolve(false)
    }

    return this.goconfig.locator.findTool('gogetdoc').then((cmd) => {
      if (cmd) {
        return cmd
      }
      // first check for Go 1.6+, if we don't have that, don't even offer to
      // 'go get', since it will definitely fail
      return this.goconfig.locator.runtime().then((runtime) => {
        if (!runtime) {
          return false
        }
        const components = runtime.semver.split('.')
        if (!components || components.length < 2) {
          return false
        }
        const minor = parseInt(components[1], 10)
        if (minor < 6) {
          atom.notifications.addError('godoc requires Go 1.6 or later', {
            detail: 'The go-plus package uses the `gogetdoc` tool, which requires Go 1.6 or later; please update your Go installation to use the doc feature.',
            dismissable: true
          })
          return false
        }
        if (!this.goget) {
          return false
        }
        return this.goget.get({
          name: 'gogetdoc',
          packageName: 'gogetdoc',
          packagePath: 'github.com/zmb3/gogetdoc',
          type: 'missing'
        }).then((r) => {
          if (r.success) {
            return this.goconfig.locator.findTool('gogetdoc')
          }
          console.log('gogetdoc is not available and could not be installed via "go get -u github.com/zmb3/gogetdoc"; please manually install it to enable doc functionality')
          return false
        }).catch((e) => {
          console.log(e)
        })
      })
    })
  }

  dispose () {
    this.subscriptions.dispose()
    this.subscriptions = null
    this.goconfig = null
    this.panelModel = null
  }

  getDoc (file, offset, cwd, cmd, stdin) {
    if (!this.goconfig || !this.goconfig.executor) {
      return {success: false, result: null}
    }

    // use a large line length because Atom will wrap the paragraphs automatically
    const args = ['-pos', `${file}:#${offset}`, '-linelength', '999']

    const options = {cwd: cwd}
    if (stdin && stdin !== '') {
      args.push('-modified')
      options.input = stdin
    }
    this.panelModel.updateContent('Generating documentation...')
    return this.goconfig.executor.exec(cmd, args, options).then((r) => {
      if (r.error) {
        if (r.error.code === 'ENOENT') {
          atom.notifications.addError('Missing Tool', {
            detail: 'Missing the `gogetdoc` tool.',
            dismissable: true
          })
        } else {
          atom.notifications.addError('Error', {
            detail: r.error.message,
            dismissable: true
          })
        }
        return {success: false, result: r}
      }
      const message = r.stdout.trim()
      if (message) {
        this.panelModel.updateContent(message)
      }

      if (r.exitcode !== 0 || r.stderr && r.stderr.trim() !== '') {
        // TODO: notification?
        return {success: false, result: r}
      }

      return {success: true, result: r}
    })
  }

  editorByteOffset (editor) {
    const cursor = editor.getLastCursor()
    const range = cursor.getCurrentWordBufferRange()
    const middle = new Point(range.start.row, Math.floor((range.start.column + range.end.column) / 2))
    const charOffset = editor.buffer.characterIndexForPosition(middle)
    const text = editor.getText().substring(0, charOffset)
    return Buffer.byteLength(text, 'utf8')
  }

  getPanel () {
    return this.panelModel
  }
}

export {Godoc}
