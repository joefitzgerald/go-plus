'use babel'

import {CompositeDisposable, Point} from 'atom'
import {NavigationStack} from './navigation-stack'
import {getEditor, isValidEditor, openFile} from '../utils'
import path from 'path'
import fs from 'fs'

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

  utf8OffsetForBufferPosition (pos, editor = getEditor()) {
    if (!editor || !editor.getBuffer()) {
      return
    }
    const characterOffset = editor.getBuffer().characterIndexForPosition(pos)
    const text = editor.getText().substring(0, characterOffset)
    return Buffer.byteLength(text, 'utf8')
  }

  gotoDefinitionForBufferPosition (pos, editor = getEditor()) {
    if (!editor || !pos) {
      return
    }
    const offset = this.utf8OffsetForBufferPosition(pos, editor)
    const tool = atom.config.get('go-plus.navigator.mode')
    return this.goconfig.locator.findTool(tool).then((cmd) => {
      if (!cmd) {
        return
      }

      const filepath = editor.getPath()
      let args
      let archive = ''
      if (tool === 'guru') {
        for (const e of atom.workspace.getTextEditors()) {
          if (e.isModified() && isValidEditor(e)) {
            archive += e.getTitle() + '\n'
            archive += Buffer.byteLength(e.getText(), 'utf8') + '\n'
            archive += e.getText()
          }
        }
        args = ['-json', 'definition', filepath + ':#' + offset]
        if (archive && archive !== '') {
          args.unshift('-modified')
        }
      } else {
        args = ['-f', filepath, '-o', offset, '-i']
      }
      const options = this.goconfig.executor.getOptions('file')
      if (tool === 'godef') {
        options.input = editor.getText()
      } else if (tool === 'guru' && archive && archive !== '') {
        options.input = archive
      }

      return this.goconfig.executor.exec(cmd, args, options).then((r) => {
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
    })
  }

  checkForTool (editor = getEditor()) {
    return this.goconfig.locator.findTool('godef').then((cmd) => {
      if (cmd) {
        return cmd
      }

      return false
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

    const components = output.objpos.trim().split(':')
    let colNumber = 0
    let rowNumber = 0
    if (components.length > 1) {
      colNumber = components.pop()
      rowNumber = components.pop()
    }
    const targetFilePath = components.join(':')
    const result = {
      filepath: targetFilePath,
      raw: stdout
    }

    if (rowNumber && colNumber) {
      result.pos = new Point(parseInt(rowNumber, 10) - 1, parseInt(colNumber, 10) - 1)
    }
    return result
  }

  parseGodefLocation (godefStdout) {
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

    return this.stat(loc.filepath).then((stats) => {
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

  stat (loc) {
    return new Promise((resolve, reject) => {
      fs.stat(loc, (err, stats) => {
        if (err) {
          reject(err)
        }
        resolve(stats)
      })
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
          reject(dir + 'has no non-test .go file')
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

    return
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
    cursor.onDidChangePosition(() => {
      marker.destroy()
    })
  }
}

export {Godef}
