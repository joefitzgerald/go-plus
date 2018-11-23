// @flow

import path from 'path'
import { CompositeDisposable, Point, Range } from 'atom'
import GodocPanel from './godoc-panel'
import { isValidEditor, utf8OffsetForBufferPosition } from '../utils'
import { buildGuruArchive } from '../guru-utils'
import os from 'os'

import type { GoConfig } from './../config/service'
import type { ExecutorOptions } from './../config/executor'

export type GogetdocResult = {
  name: string,
  import: string,
  pkg: string,
  decl: string,
  doc: string,
  pos: string,

  gddo?: string // godoc.org link (we add this ourselves)
}

type MarkedString = {
  type: 'markdown',
  value: string
}

type Datatip = {
  markedStrings: Array<MarkedString>,
  range: atom$Range,
  pinnable?: boolean
}

class Godoc {
  goconfig: GoConfig
  subscriptions: CompositeDisposable
  priority: number = 2
  grammarScopes = ['source.go', 'go']
  providerName = 'go-plus'
  panelModel: GodocPanel
  methodRegexp: RegExp
  electedNotToUpdate: boolean

  constructor(goconfig: GoConfig) {
    this.goconfig = goconfig
    this.subscriptions = new CompositeDisposable()
    this.panelModel = new GodocPanel()
    this.subscriptions.add(this.panelModel)
    this.subscriptions.add(
      atom.commands.add('atom-text-editor', 'golang:showdoc', () =>
        this.commandInvoked()
      )
    )
    this.methodRegexp = /(?:^func \(\w+ \**)(\w+)/
  }

  async commandInvoked() {
    const editor = atom.workspace.getActiveTextEditor()
    if (!editor || !isValidEditor(editor)) {
      return
    }

    const cmd = await this.goconfig.locator.findTool('gogetdoc')
    if (!cmd) {
      // TODO: notification?
      return { success: false, result: null }
    }

    const file = editor.getBuffer().getPath()
    const cwd = file ? path.dirname(file) : process.cwd()
    const offset = this.editorByteOffset(editor)

    // package up unsaved buffers in the Guru archive format
    const archive = buildGuruArchive()
    if (file) {
      return this.getDoc(file, offset, cwd, cmd, archive)
    }
  }

  dispose() {
    this.subscriptions.dispose()
  }

  async datatip(
    editor: atom$TextEditor,
    bufferPosition: atom$Point
  ): Promise<?Datatip> {
    const cmd = await this.goconfig.locator.findTool('gogetdoc')
    if (!cmd) return null

    const file = editor.getBuffer().getPath()
    if (!file) return null

    const cwd = path.dirname(file)
    const offset = utf8OffsetForBufferPosition(bufferPosition, editor)
    const archive = buildGuruArchive()
    const args = ['-pos', `${file}:#${offset}`, '-linelength', '999', '-json']

    const options = {}
    options.cwd = cwd
    if (archive && archive.length) {
      options.input = archive
      args.push('-modified')
    }
    const r = await this.goconfig.executor.exec(cmd, args, options)
    if (r.exitcode !== 0) return null

    const stdout = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
    const doc: GogetdocResult = JSON.parse(stdout.trim())
    const markedStrings = [
      {
        type: 'markdown',
        value: `### ${doc.name}

import "${doc.import}"

\`${doc.decl}\`

${doc.doc}`
      }
    ]
    return {
      range: new Range(bufferPosition, bufferPosition),
      markedStrings,
      pinnable: true
    }
  }

  async getDoc(
    file: string,
    offset: number,
    cwd: string,
    cmd: string,
    stdin: string
  ) {
    if (!this.goconfig || !this.goconfig.executor) {
      return { success: false, result: null }
    }

    // use a large line length because Atom will wrap the paragraphs automatically
    const args = ['-pos', `${file}:#${offset}`, '-linelength', '999', '-json']

    const options: ExecutorOptions = {}
    options.cwd = cwd
    if (stdin && stdin !== '') {
      args.push('-modified')
      options.input = stdin
    }
    this.panelModel.updateMessage('Generating documentation...')
    const r = await this.goconfig.executor.exec(cmd, args, options)
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
      return { success: false, result: r }
    }
    const stderr = r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr
    const stdout = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
    if (r.exitcode !== 0 || (stderr && stderr.trim() !== '')) {
      this.panelModel.updateMessage(stdout.trim() + os.EOL + stderr.trim())
      return { success: false, result: r }
    }

    const doc: GogetdocResult = JSON.parse(stdout.trim())
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
          doc.gddo =
            'https://godoc.org/' + doc.import + '#' + typ + '.' + doc.name
        } else {
          doc.gddo = 'https://godoc.org/' + doc.import + '#' + doc.name
        }
      }
      this.panelModel.updateContent(doc)
    }

    return { success: true, result: r, doc: doc }
  }

  declIsMethod(decl: string): ?string {
    // func (receiver Type) Name(Args...) -> return Type
    // func Name(Args...) -> return undefined
    const matches = this.methodRegexp.exec(decl)
    if (matches && matches.length) {
      return matches[matches.length - 1]
    }
    return undefined
  }

  promptForToolsUpdate() {
    if (this.electedNotToUpdate) {
      return
    }
    this.electedNotToUpdate = true

    const notification = atom.notifications.addWarning('go-plus', {
      dismissable: true,
      detail: '`gogetdoc` may be out of date',
      description:
        'Your `gogetdoc` tool may be out of date.' +
        os.EOL +
        os.EOL +
        'Would you like to run `go get -u github.com/zmb3/gogetdoc` to update?',
      buttons: [
        {
          text: 'Yes',
          onDidClick: () => {
            notification.dismiss()
            atom.commands.dispatch(
              atom.views.getView(atom.workspace),
              'golang:update-tools',
              ['github.com/zmb3/gogetdoc']
            )
          }
        },
        {
          text: 'Not Now',
          onDidClick: () => {
            notification.dismiss()
          }
        }
      ]
    })
  }

  editorByteOffset(editor: any): number {
    const cursor = editor.getLastCursor()
    const range = cursor.getCurrentWordBufferRange()
    const middle = new Point(
      range.start.row,
      Math.floor((range.start.column + range.end.column) / 2)
    )
    const charOffset = editor.buffer.characterIndexForPosition(middle)
    const text = editor.getText().substring(0, charOffset)
    return Buffer.byteLength(text, 'utf8')
  }

  getPanel() {
    return this.panelModel
  }
}

export { Godoc }
