'use babel'

import {CompositeDisposable, Point} from 'atom'
import {NavigationStack} from './navigation-stack'
import {getEditor} from '../utils'
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
        detail: 'godef only works with a single cursor'
      })
      return Promise.resolve(false)
    }

    return Promise.resolve().then(() => {
      const editorCursorUTF8Offset = (e) => {
        const characterOffset = e.getBuffer().characterIndexForPosition(e.getCursorBufferPosition())
        const text = e.getText().substring(0, characterOffset)
        return Buffer.byteLength(text, 'utf8')
      }

      const offset = editorCursorUTF8Offset(editor)
      if (this.cursorOnChangeSubscription) {
        this.cursorOnChangeSubscription.dispose()
        this.cursorOnChangeSubscription = null
      }
      return this.gotoDefinitionWithParameters(['-o', offset, '-i'], editor.getText())
    })
  }

  gotoDefinitionForWord (word) {
    return this.gotoDefinitionWithParameters([word], undefined)
  }

  gotoDefinitionWithParameters (cmdArgs, cmdInput = undefined) {
    const editor = getEditor()
    return this.checkForTool(editor).then((cmd) => {
      if (!cmd) {
        return
      }

      const filepath = editor.getPath()
      const args = ['-f', filepath].concat(cmdArgs)
      const options = this.getExecutorOptions(editor)
      if (cmdInput) {
        options.input = cmdInput
      }
      return this.goconfig.executor.exec(cmd, args, options).then((r) => {
        if (r.exitcode !== 0) {
          // TODO: Notification?
          return false
        }
        if (r.stderr && r.stderr.trim() !== '') {
          console.log('godef: (stderr) ' + r.stderr)
        }
        return this.visitLocation(this.parseGodefLocation(r.stdout))
      }).catch((e) => {
        console.log(e)
        return false
      })
    })
  }

  getLocatorOptions (editor = getEditor()) {
    const options = {}
    if (editor) {
      options.file = editor.getPath()
      options.directory = path.dirname(editor.getPath())
    }
    if (!options.directory && atom.project.paths.length) {
      options.directory = atom.project.paths[0]
    }

    return options
  }

  getExecutorOptions (editor = getEditor()) {
    const o = this.getLocatorOptions(editor)
    const options = {}
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

  checkForTool (editor = getEditor()) {
    const options = this.getLocatorOptions(editor)
    return this.goconfig.locator.findTool('godef', options).then((cmd) => {
      if (cmd) {
        return cmd
      }

      return false
    })
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

  visitLocation (loc, callback) {
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
        return this.visitDirectory(loc, callback)
      } else {
        return this.visitFile(loc, callback)
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

  visitFile (loc, callback) {
    return atom.workspace.open(loc.filepath).then((editor) => {
      if (loc.pos) {
        editor.scrollToBufferPosition(loc.pos)
        editor.setCursorBufferPosition(loc.pos)
        this.cursorOnChangeSubscription = this.highlightWordAtCursor(editor)
      }
    })
  }

  visitDirectory (loc, callback) {
    return this.findFirstGoFile(loc.filepath).then((file) => {
      return this.visitFile({filepath: file, raw: loc.raw}, callback)
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
