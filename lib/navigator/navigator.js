// @flow

import fs from 'fs'
import path from 'path'
import { CompositeDisposable, Point } from 'atom'
import { adjustPositionForGuru, buildGuruArchive } from '../guru-utils'
import {
  getEditor,
  openFile,
  parseGoPosition,
  stat,
  utf8OffsetForBufferPosition
} from '../utils'
import { NavigationStack } from './navigation-stack'

import type { GoConfig } from './../config/service'
import type { ExecResult } from './../config/executor'
import type { DefLocation } from './definition-types'

class Navigator {
  goconfig: GoConfig
  godefCommand: string
  returnCommand: string
  navigationStack: NavigationStack
  subscriptions: CompositeDisposable
  disposed: boolean

  constructor(goconfig: GoConfig) {
    this.goconfig = goconfig
    this.godefCommand = 'golang:godef'
    this.returnCommand = 'golang:godef-return'
    this.navigationStack = new NavigationStack()
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(
      atom.commands.add('atom-workspace', 'golang:godef', () => {
        if (!this.disposed) {
          this.gotoDefinitionForWordAtCursor()
        }
      })
    )
    this.subscriptions.add(
      atom.commands.add('atom-workspace', 'golang:godef-return', () => {
        if (this.navigationStack && !this.disposed) {
          this.navigationStack.restorePreviousLocation()
        }
      })
    )
    this.disposed = false
  }

  dispose() {
    this.disposed = true
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
  }

  async gotoDefinitionForWordAtCursor(): Promise<any> {
    const editor = getEditor()
    if (!editor) {
      return false
    }

    if (editor.hasMultipleCursors()) {
      atom.notifications.addWarning('go-plus', {
        dismissable: true,
        icon: 'location',
        detail: 'go to definition only works with a single cursor'
      })
      return false
    }

    return this.gotoDefinitionForBufferPosition(
      editor.getCursorBufferPosition(),
      editor
    )
  }

  async definitionForBufferPosition(
    pos: atom$Point,
    editor: TextEditor
  ): Promise<?DefLocation> {
    const tool = atom.config.get('go-plus.navigator.mode')
    const r =
      tool === 'guru'
        ? await this.executeGuru(pos, editor)
        : await this.executeGodef(pos, editor)
    if (!r || r.exitcode !== 0) {
      return null
    }
    const stdout = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
    return tool === 'guru'
      ? this.parseGuruLocation(stdout)
      : this.parseGodefLocation(stdout)
  }

  async gotoDefinitionForBufferPosition(
    pos: atom$Point,
    editor: TextEditor
  ): Promise<any> {
    if (!editor || !pos) {
      return false
    }

    const def = await this.definitionForBufferPosition(pos, editor)
    if (!def || !def.pos) return false

    return this.visitLocation(def)
  }

  async executeGuru(
    pos: atom$Point,
    editor: TextEditor
  ): Promise<ExecResult | false> {
    if (!editor || !pos) {
      return false
    }
    const cmd = await this.goconfig.locator.findTool('guru')
    if (!cmd) {
      return false
    }
    const filepath = editor.getPath()
    if (!filepath) {
      return false
    }
    const archive = buildGuruArchive()

    const options = this.goconfig.executor.getOptions('file', editor)
    if (archive && archive !== '') {
      options.input = archive
    }

    pos = adjustPositionForGuru(pos, editor)
    const offset = utf8OffsetForBufferPosition(pos, editor)
    const args = ['-json', 'definition', filepath + ':#' + offset]
    if (archive && archive !== '') {
      args.unshift('-modified')
    }
    return this.goconfig.executor.exec(cmd, args, options)
  }

  async executeGodef(
    pos: atom$PointLike,
    editor: TextEditor
  ): Promise<ExecResult | false> {
    const cmd = await this.goconfig.locator.findTool('godef')
    if (!cmd) {
      return false
    }
    const filepath = editor.getPath()
    if (!filepath) {
      return false
    }
    const offset = utf8OffsetForBufferPosition(pos, editor)
    const args = ['-f', filepath, '-o', offset.toString(), '-i']
    const options = this.goconfig.executor.getOptions('file', editor)
    options.input = editor.getText()
    return this.goconfig.executor.exec(cmd, args, options)
  }

  parseGuruLocation(stdout: string): DefLocation | null {
    let output
    try {
      output = JSON.parse(stdout)
    } catch (e) {
      console.log(e) // eslint-disable-line no-console
    }

    if (!output || !output.objpos) {
      return null
    }

    const parsed = parseGoPosition(output.objpos.trim())
    if (!parsed) {
      return null
    }
    const result = {}
    result.filepath = parsed.file
    result.raw = stdout

    if (parsed.line !== false && parsed.column !== false) {
      result.pos = new Point(
        parseInt(parsed.line) - 1,
        parseInt(parsed.column) - 1
      )
    }
    return result
  }

  parseGodefLocation(godefStdout: string): DefLocation | null {
    const pos = parseGoPosition(godefStdout)

    const result = {}
    result.filepath = pos.file
    result.raw = godefStdout

    if (pos.hasOwnProperty('line') && pos.hasOwnProperty('column')) {
      // atom's cursors are 0-based; godef uses diff-like 1-based
      const correct = str => parseInt(str, 10) - 1
      result.pos = new Point(correct(pos.line), correct(pos.column))
    }
    return result
  }

  async visitLocation(loc: DefLocation | null) {
    if (!loc || !loc.filepath) {
      const opts = {}
      opts.dismissable = true
      opts.icon = 'location'
      opts.detail = 'definition tool returned malformed output'

      if (loc) {
        opts.description = JSON.stringify(loc.raw)
      }
      atom.notifications.addWarning('go-plus', opts)
      return false
    }
    try {
      const l: DefLocation = loc
      const stats = await stat(loc.filepath)
      this.navigationStack.pushCurrentLocation()
      if (stats.isDirectory()) {
        return this.visitDirectory(l)
      } else {
        return this.visitFile(l)
      }
    } catch (e) {
      atom.notifications.addWarning('go-plus', {
        dismissable: true,
        icon: 'location',
        detail: 'definition tool returned invalid file path',
        description: loc.filepath
      })
      return false
    }
  }

  async visitFile(loc: DefLocation): Promise<TextEditor> {
    return openFile(loc.filepath, loc.pos)
  }

  async visitDirectory(loc: DefLocation): Promise<?TextEditor> {
    try {
      const file = await this.findFirstGoFile(loc.filepath)
      loc.filepath = file
      return this.visitFile(loc)
    } catch (err) {
      if (err.handle) {
        err.handle()
      }
      atom.notifications.addWarning('go-plus', {
        dismissable: true,
        icon: 'location',
        detail: 'godef return invalid directory',
        description: loc.filepath
      })
    }
  }

  findFirstGoFile(dir: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readdir(dir, (err, files) => {
        if (err) {
          reject(err)
        }

        const filepath = this.firstGoFilePath(dir, files.sort())
        if (filepath) {
          resolve(filepath)
        } else {
          reject(new Error(dir + 'has no non-test .go file'))
        }
      })
    })
  }

  firstGoFilePath(dir: string, files: Array<string>): string | null {
    for (const file of files) {
      if (file.endsWith('.go') && file.indexOf('_test') === -1) {
        return path.join(dir, file)
      }
    }
    return null
  }
}

export { Navigator }
