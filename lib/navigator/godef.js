// @flow

import {CompositeDisposable, Point} from 'atom'
import {adjustPositionForGuru, buildGuruArchive} from '../guru-utils'
import {getEditor, openFile, parseGoPosition, stat, utf8OffsetForBufferPosition} from '../utils'
import {NavigationStack} from './navigation-stack'
import fs from 'fs'
import path from 'path'

import type {Disposable} from 'atom'
import type {GoConfig} from './../config/service'
import type {ExecResult} from './../config/executor'
import type {DefLocation} from './definition-types'

class Godef {
  goconfig: GoConfig
  godefCommand: string
  returnCommand: string
  navigationStack: NavigationStack
  subscriptions: CompositeDisposable
  disposed: bool
  cursorOnChangeSubscription: Disposable

  constructor (goconfig: GoConfig) {
    this.goconfig = goconfig
    this.godefCommand = 'golang:godef'
    this.returnCommand = 'golang:godef-return'
    this.navigationStack = new NavigationStack()
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add('atom-workspace', 'golang:godef', () => {
      if (!this.disposed) {
        this.gotoDefinitionForWordAtCursor()
      }
    }))
    this.subscriptions.add(atom.commands.add('atom-workspace', 'golang:godef-return', () => {
      if (this.navigationStack && !this.disposed) {
        this.navigationStack.restorePreviousLocation()
      }
    }))
    this.cursorOnChangeSubscription = null
    this.disposed = false
  }

  dispose () {
    this.disposed = true
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
  }

  clearReturnHistory () {
    this.navigationStack.reset()
  }

  gotoDefinitionForWordAtCursor (): Promise<any> {
    const editor = getEditor()
    if (!editor) {
      return Promise.resolve(false)
    }

    if (editor.hasMultipleCursors()) {
      atom.notifications.addWarning('go-plus', {
        dismissable: true,
        icon: 'location',
        detail: 'go to definition only works with a single cursor'
      })
      return Promise.resolve(false)
    }

    if (this.cursorOnChangeSubscription) {
      this.cursorOnChangeSubscription.dispose()
      this.cursorOnChangeSubscription = null
    }

    return this.gotoDefinitionForBufferPosition(editor.getCursorBufferPosition())
  }

  async gotoDefinitionForBufferPosition (pos: [number, number], editor: any = getEditor()): Promise<any> {
    if (!editor || !pos) {
      return false
    }
    try {
      const tool = atom.config.get('go-plus.navigator.mode')
      const r = tool === 'guru'
        ? await this.gotoDefinitionGuru(pos, editor)
        : await this.gotoDefinitionGodef(pos, editor)
      if (!r) {
        return r
      }
      const stderr = r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr
      if (stderr && stderr.trim() !== '') {
        console.log(tool + ': (stderr) ' + stderr)
      }

      if (r.exitcode !== 0) {
        atom.notifications.addError('go-plus', {
          dismissable: false,
          icon: 'location',
          detail: stderr.trim()
        })
        return false
      }

      const stdout = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
      return tool === 'guru'
        ? this.visitLocation(this.parseGuruLocation(stdout))
        : this.visitLocation(this.parseGodefLocation(stdout))
    } catch (e) {
      console.log(e)
      return false
    }
  }

  async gotoDefinitionGuru (pos: [number, number], editor: any): Promise<ExecResult | false> {
    if (!editor || !pos) {
      return false
    }
    const cmd = await this.goconfig.locator.findTool('guru')
    if (!cmd) {
      return false
    }
    const filepath = editor.getPath()
    const archive = buildGuruArchive()

    const options = this.goconfig.executor.getOptions('file')
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

  async gotoDefinitionGodef (pos: [number, number], editor: any): Promise<ExecResult | false> {
    const cmd = await this.goconfig.locator.findTool('godef')
    if (!cmd) {
      return false
    }
    const offset = utf8OffsetForBufferPosition(pos, editor)
    const filepath = editor.getPath()
    const args = ['-f', filepath, '-o', offset.toString(), '-i']
    const options = this.goconfig.executor.getOptions('file')
    options.input = editor.getText()
    return this.goconfig.executor.exec(cmd, args, options)
  }

  parseGuruLocation (stdout: string): DefLocation | null {
    let output
    try {
      output = JSON.parse(stdout)
    } catch (e) {
      console.log(e)
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
      result.pos = new Point(parseInt(parsed.line) - 1, parseInt(parsed.column) - 1)
    }
    return result
  }

  parseGodefLocation (godefStdout: string): DefLocation | null {
    // TODO: Look into using parseGoPosition
    const outputs = godefStdout.trim().split(':')
    let colNumber = 0
    let rowNumber = 0
    if (outputs.length > 1) {
      colNumber = outputs.pop()
      rowNumber = outputs.pop()
    }

    let targetFilePath = outputs.join(':')

    // godef on an import returns the imported package directory with no
    // row and column information: handle this appropriately
    if (targetFilePath.length === 0 && rowNumber) {
      targetFilePath = [rowNumber, colNumber].join(':')
      rowNumber = undefined
      colNumber = undefined
    }

    // atom's cursors are 0-based; godef uses diff-like 1-based
    const p = (rawPosition) => {
      return parseInt(rawPosition, 10) - 1
    }

    const result = {}
    result.filepath = targetFilePath
    result.raw = godefStdout

    if (rowNumber && colNumber) {
      result.pos = new Point(p(rowNumber), p(colNumber))
    }
    return result
  }

  async visitLocation (loc: DefLocation | null) {
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

  async visitFile (loc: DefLocation): Promise<void> {
    const editor = await openFile(loc.filepath, loc.pos)
    if (loc.pos) {
      this.cursorOnChangeSubscription = this.highlightWordAtCursor(editor)
    }
  }

  async visitDirectory (loc: DefLocation): Promise<void> {
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

  findFirstGoFile (dir: string): Promise<string> {
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

  firstGoFilePath (dir: string, files: Array<string>): string | null {
    for (const file of files) {
      if (file.endsWith('.go') && (file.indexOf('_test') === -1)) {
        return path.join(dir, file)
      }
    }
    return null
  }

  wordAtCursor (editor: any): {word: string, range: any} {
    const options = {
      wordRegex: /[\w+.]*/
    }

    const cursor = editor.getLastCursor()
    const range = cursor.getCurrentWordBufferRange(options)
    const word = editor.getTextInBufferRange(range)
    return {word: word, range: range}
  }

  highlightWordAtCursor (editor: any) {
    const {range} = this.wordAtCursor(editor)
    const marker = editor.markBufferRange(range, {invalidate: 'inside'})
    editor.decorateMarker(marker, {type: 'highlight', class: 'definition'})
    const cursor = editor.getLastCursor()
    const onDidChange = () => {
      marker.destroy()
      cursor.emitter.off('did-change-position', onDidChange)
    }
    cursor.onDidChangePosition(onDidChange)
  }
}

export {Godef}
