// @flow

import { CompositeDisposable, Range } from 'atom'
import { GodocPanel } from './godoc-panel'
import { utf8OffsetForBufferPosition } from '../utils'
import { buildGuruArchive } from '../guru-utils'
import os from 'os'

import type { GoConfig } from './../config/service'

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
    if (!editor) {
      return { success: false, result: null }
    }
    this.panelModel.updateMessage('Generating documentation...')
    const doc = await this.doc(editor, editor.getCursorBufferPosition())
    if (!doc) {
      return { success: false, result: null }
    }

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
    return { success: true, doc: doc }
  }

  dispose() {
    this.subscriptions.dispose()
  }

  async doc(
    editor: atom$TextEditor,
    bufferPosition: atom$Point
  ): Promise<?GogetdocResult> {
    const cmd = await this.goconfig.locator.findTool('gogetdoc')
    if (!cmd) return null

    const file = editor.getBuffer().getPath()
    if (!file) return null

    const offset = utf8OffsetForBufferPosition(bufferPosition, editor)
    const archive = buildGuruArchive()
    const args = ['-pos', `${file}:#${offset}`, '-linelength', '999', '-json']

    const options = this.goconfig.executor.getOptions('project', editor)
    if (archive && archive.length) {
      options.input = archive
      args.push('-modified')
    }
    const r = await this.goconfig.executor.exec(cmd, args, options)
    if (r.exitcode !== 0) return null

    const stdout = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
    const doc: GogetdocResult = JSON.parse(stdout.trim())
    return doc
  }

  async datatip(
    editor: atom$TextEditor,
    bufferPosition: atom$Point
  ): Promise<?Datatip> {
    const doc = await this.doc(editor, bufferPosition)
    if (!doc) return null

    const markedStrings = [
      {
        type: 'markdown',
        value: `### ${doc.name}

import "${doc.import}"

\`\`\`go
${doc.decl}
\`\`\`

${doc.doc}`
      }
    ]
    return {
      range: new Range(bufferPosition, bufferPosition),
      markedStrings,
      pinnable: true
    }
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

  getPanel() {
    return this.panelModel
  }
}

export { Godoc }
