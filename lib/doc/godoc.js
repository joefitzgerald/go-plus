'use babel'

import path from 'path'
import {CompositeDisposable, Point} from 'atom'
import GodocPanel from './godoc-panel'
import {isValidEditor} from '../utils'

class Godoc {
  constructor (goconfig) {
    this.goconfig = goconfig
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
      return false
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
    const args = ['-pos', `${file}:#${offset}`, '-linelength', '999', '-json']

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
      const doc = JSON.parse(r.stdout.trim())
      if (doc) {
        if (doc.import && doc.import.length) {
          doc.gddo = `https://godoc.org/${doc.import}#${doc.name}`
        } else {
          // no import means we have package doc
          doc.gddo = `https://godoc.org/${doc.name}`
        }
        this.panelModel.updateContent(doc)
      }

      if (r.exitcode !== 0 || r.stderr && r.stderr.trim() !== '') {
        // TODO: notification?
        return {success: false, result: r}
      }

      return {success: true, result: r, doc: doc}
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
