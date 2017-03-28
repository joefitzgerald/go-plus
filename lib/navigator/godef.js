'use babel'

import {CompositeDisposable, Point} from 'atom'
import {adjustPositionForGuru, buildGuruArchive} from '../guru-utils'
import {getEditor, openFile, parseGoPosition, stat, utf8OffsetForBufferPosition} from '../utils'
import {NavigationStack} from './navigation-stack'
import fs from 'fs'
import path from 'path'

class Godef {
  constructor (goconfig) {
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
    this.goconfig = null
  }

  clearReturnHistory () {
    this.navigationStack.reset()
  }

  gotoDefinitionForWordAtCursor () {
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

    return Promise.resolve().then(() => {
      if (this.cursorOnChangeSubscription) {
        this.cursorOnChangeSubscription.dispose()
        this.cursorOnChangeSubscription = null
      }
      return this.gotoDefinitionForBufferPosition(editor.getCursorBufferPosition())
    })
  }

  gotoDefinitionForBufferPosition (pos, editor = getEditor()) {
    if (!editor || !pos) {
      return false
    }
    const tool = atom.config.get('go-plus.navigator.mode')
    let prom
    if (tool === 'guru') {
      prom = this.gotoDefinitionGuru(pos, editor)
    } else {
      prom = this.gotoDefinitionGodef(pos, editor)
    }
    return prom.then((r) => {
      if (!r) {
        return r
      }

      if (r.stderr && r.stderr.trim() !== '') {
        console.log(tool + ': (stderr) ' + r.stderr)
      }

      if (r.exitcode !== 0) {
        atom.notifications.addError('go-plus', {
          dismissable: false,
          icon: 'location',
          detail: r.stderr.trim()
        })
        return false
      }

      if (tool === 'guru') {
        return this.visitLocation(this.parseGuruLocation(r.stdout))
      }
      return this.visitLocation(this.parseGodefLocation(r.stdout))
    }).catch((e) => {
      console.log(e)
      return false
    })
  }

  gotoDefinitionGuru (pos, editor) {
    if (!editor || !pos) {
      return
    }

    return this.goconfig.locator.findTool('guru').then((cmd) => {
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
    })
  }

  gotoDefinitionGodef (pos, editor) {
    return this.goconfig.locator.findTool('godef').then((cmd) => {
      if (!cmd) {
        return
      }

      const offset = utf8OffsetForBufferPosition(pos, editor)
      const filepath = editor.getPath()
      const args = ['-f', filepath, '-o', offset, '-i']
      const options = this.goconfig.executor.getOptions('file')
      options.input = editor.getText()

      return this.goconfig.executor.exec(cmd, args, options)
    })
  }

  parseGuruLocation (stdout) {
    let output
    try {
      output = JSON.parse(stdout)
    } catch (e) {
      console.log(e)
    }

    if (!output || !output.objpos) {
      return
    }

    const parsed = parseGoPosition(output.objpos.trim())
    if (!parsed) {
      return
    }
    const result = {
      filepath: parsed.file,
      raw: stdout
    }

    if (parsed.line !== false && parsed.column !== false) {
      result.pos = new Point(parsed.line - 1, parsed.column - 1)
    }
    return result
  }

  parseGodefLocation (godefStdout) {
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

    const result = {
      filepath: targetFilePath,
      raw: godefStdout
    }

    if (rowNumber && colNumber) {
      result.pos = new Point(p(rowNumber), p(colNumber))
    }
    return result
  }

  visitLocation (loc) {
    if (!loc || !loc.filepath) {
      let opts = {
        dismissable: true,
        icon: 'location',
        detail: 'godef returned malformed output'
      }
      if (loc) {
        opts.description = JSON.stringify(loc.raw)
      }
      atom.notifications.addWarning('go-plus', opts)
      return false
    }

    return stat(loc.filepath).then((stats) => {
      this.navigationStack.pushCurrentLocation()
      if (stats.isDirectory()) {
        return this.visitDirectory(loc)
      } else {
        return this.visitFile(loc)
      }
    }, () => {
      atom.notifications.addWarning('go-plus', {
        dismissable: true,
        icon: 'location',
        detail: 'godef returned invalid file path',
        description: loc.filepath
      })
      return false
    })
  }

  visitFile (loc) {
    const { pos } = loc
    return openFile(loc.filepath, pos).then((editor) => {
      if (pos) {
        this.cursorOnChangeSubscription = this.highlightWordAtCursor(editor)
      }
    })
  }

  visitDirectory (loc) {
    return this.findFirstGoFile(loc.filepath).then((file) => {
      return this.visitFile({filepath: file, raw: loc.raw})
    }).catch((err) => {
      if (err.handle) {
        err.handle()
      }
      atom.notifications.addWarning('go-plus', {
        dismissable: true,
        icon: 'location',
        detail: 'godef return invalid directory',
        description: loc.filepath
      })
    })
  }

  findFirstGoFile (dir) {
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

  firstGoFilePath (dir, files) {
    for (const file of files) {
      if (file.endsWith('.go') && (file.indexOf('_test') === -1)) {
        return path.join(dir, file)
      }
    }
  }

  wordAtCursor (editor = this.editor) {
    const options = {
      wordRegex: /[\w+.]*/
    }

    const cursor = editor.getLastCursor()
    const range = cursor.getCurrentWordBufferRange(options)
    const word = editor.getTextInBufferRange(range)
    return {word: word, range: range}
  }

  highlightWordAtCursor (editor = this.editor) {
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
