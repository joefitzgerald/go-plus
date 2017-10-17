'use babel'

import path from 'path'
import {CompositeDisposable, Point} from 'atom'
import GodocPanel from './godoc-panel'
import {isValidEditor} from '../utils'
import {buildGuruArchive} from '../guru-utils'
import os from 'os'

class Godoc {
  constructor (goconfig) {
    this.goconfig = goconfig
    this.subscriptions = new CompositeDisposable()
    this.panelModel = new GodocPanel()
    this.subscriptions.add(this.panelModel)
    this.subscriptions.add(atom.commands.add(
      'atom-text-editor', 'golang:showdoc',
      () => this.commandInvoked()))
    this.methodRegexp = /(?:^func \(\w+ \**)(\w+)/
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
      const archive = buildGuruArchive()
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
    this.methodRegexp = null
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
    this.panelModel.updateMessage('Generating documentation...')
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

      if (r.exitcode !== 0 || (r.stderr && r.stderr.trim() !== '')) {
        this.panelModel.updateMessage(r.stdout.trim() + os.EOL + r.stderr.trim())
        return {success: false, result: r}
      }

      const doc = JSON.parse(r.stdout.trim())
      if (doc) {
        if (doc.decl.startsWith('package')) {
          // older versions of gogetdoc didn't populate the import property
          // for packages - prompt user to update
          if (!doc.import || !doc.import.length) {
            this.promptForToolsUpdate()
          } else {
            doc.gddo = 'https://godoc.org/' + doc.import
          }
        } else {
          const typ = this.declIsMethod(doc.decl)
          if (typ) {
            doc.gddo = 'https://godoc.org/' + doc.import + '#' + typ + '.' + doc.name
          } else {
            doc.gddo = 'https://godoc.org/' + doc.import + '#' + doc.name
          }
        }
        this.panelModel.updateContent(doc)
      }

      return {success: true, result: r, doc: doc}
    })
  }

  declIsMethod (decl) {
    // func (receiver Type) Name(Args...) -> return Type
    // func Name(Args...) -> return undefined
    const matches = this.methodRegexp.exec(decl)
    if (matches && matches.length) {
      return matches[matches.length - 1]
    }
    return undefined
  }

  promptForToolsUpdate () {
    if (this.electedNotToUpdate) {
      return
    }
    this.electedNotToUpdate = true

    const notification = atom.notifications.addWarning('go-plus', {
      dismissable: true,
      detail: '`gogetdoc` may be out of date',
      description: 'Your `gogetdoc` tool may be out of date.' + os.EOL + os.EOL + 'Would you like to run `go get -u github.com/zmb3/gogetdoc` to update?',
      buttons: [{
        text: 'Yes',
        onDidClick: () => {
          notification.dismiss()
          atom.commands.dispatch(atom.views.getView(atom.workspace), 'golang:update-tools', ['github.com/zmb3/gogetdoc'])
        }
      }, {
        text: 'Not Now',
        onDidClick: () => {
          notification.dismiss()
        }
      }]
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
