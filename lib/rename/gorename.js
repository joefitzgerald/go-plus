'use babel'

import path from 'path'
import {CompositeDisposable, Point} from 'atom'
import {RenameDialog} from './rename-dialog'
import {isValidEditor} from '../utils'

class Gorename {
  constructor (goconfig, goget) {
    this.goconfig = goconfig
    this.goget = goget
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add(
      'atom-text-editor', 'golang:gorename',
      () => this.commandInvoked()
    ))
  }

  commandInvoked () {
    const editor = atom.workspace.getActiveTextEditor()
    if (!isValidEditor(editor)) {
      return
    }
    this.checkForTool(editor).then((cmd) => {
      if (!cmd) {
        // TODO: Show a notification?
        return
      }

      const {word, offset} = this.wordAndOffset(editor)
      const cursor = editor.getCursorBufferPosition()

      const dialog = new RenameDialog(word, (newName) => {
        this.saveAllEditors()
        const file = editor.getBuffer().getPath()
        const cwd = path.dirname(file)

        // restore cursor position after gorename completes and the buffer is reloaded
        if (cursor) {
          const disp = editor.getBuffer().onDidReload(() => {
            editor.setCursorBufferPosition(cursor, {autoscroll: false})
            const element = atom.views.getView(editor)
            if (element) {
              element.focus()
            }
            disp.dispose()
          })
        }
        this.runGorename(file, offset, cwd, newName, cmd)
      })
      dialog.onCancelled(() => {
        editor.setCursorBufferPosition(cursor, {autoscroll: false})
        const element = atom.views.getView(editor)
        if (element) {
          element.focus()
        }
      })
      dialog.attach()
      return
    }).catch((e) => {
      if (e.handle) {
        e.handle()
      }
      console.log(e)
    })
  }

  saveAllEditors () {
    for (const editor of atom.workspace.getTextEditors()) {
      if (editor.isModified() && isValidEditor(editor)) {
        editor.save()
      }
    }
  }

  wordAndOffset (editor) {
    const cursor = editor.getLastCursor()
    const range = cursor.getCurrentWordBufferRange()
    const middle = new Point(range.start.row, Math.floor((range.start.column + range.end.column) / 2))
    const charOffset = editor.buffer.characterIndexForPosition(middle)
    const text = editor.getText().substring(0, charOffset)
    return {word: editor.getTextInBufferRange(range), offset: Buffer.byteLength(text, 'utf8')}
  }

  runGorename (file, offset, cwd, newName, cmd) {
    if (!this.goconfig || !this.goconfig.executor) {
      return {success: false, result: null}
    }

    const args = ['-offset', `${file}:#${offset}`, '-to', newName]
    const options = {
      cwd: cwd,
      env: this.goconfig.environment()
    }
    return this.goconfig.executor.exec(cmd, args, options).then((r) => {
      if (r.error) {
        if (r.error.code === 'ENOENT') {
          atom.notifications.addError('Missing Rename Tool', {
            detail: 'The gorename tool is required to perform a rename. Please run go get -u golang.org/x/tools/cmd/gorename to get it.',
            dismissable: true
          })
        } else {
          atom.notifications.addError('Rename Error', {
            detail: r.error.message,
            dismissable: true
          })
        }
        return {success: false, result: r}
      }

      const message = r.stderr.trim() + '\r\n' + r.stdout.trim()
      if (r.exitcode !== 0 || r.stderr && r.stderr.trim() !== '') {
        atom.notifications.addWarning('Rename Error', {
          detail: message.trim(),
          dismissable: true
        })
        return {success: false, result: r}
      }

      atom.notifications.addSuccess(message.trim())
      return {success: true, result: r}
    })
  }

  checkForTool (editor) {
    if (!this.goconfig) {
      return Promise.resolve(false)
    }

    return this.goconfig.locator.findTool('gorename').then((cmd) => {
      if (cmd) {
        return cmd
      }

      if (!this.goget) {
        return false
      }

      if (this.toolCheckComplete) {
        return false
      }

      this.toolCheckComplete = true
      return this.goget.get({
        name: 'gorename',
        packageName: 'gorename',
        packagePath: 'golang.org/x/tools/cmd/gorename',
        type: 'missing'
      }).then((r) => {
        if (r.success) {
          return this.goconfig.locator.findTool('gorename')
        }

        console.log('gorename is not available and could not be installed via "go get -u golang.org/x/tools/cmd/gorename"; please manually install it to enable gorename behavior.')
        return false
      }).catch((e) => {
        console.log(e)
        return false
      })
    })
  }

  dispose () {
    this.subscriptions.dispose()
    this.subscriptions = null
    this.goconfig = null
    this.goget = null
  }
}

export {Gorename}
