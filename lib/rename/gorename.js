// @flow

import path from 'path'
import {CompositeDisposable, Point} from 'atom'
import SimpleDialog from './../simple-dialog'
import {isValidEditor} from '../utils'

import type {GoConfig} from './../config/service'

class Gorename {
  goconfig: GoConfig
  subscriptions: CompositeDisposable

  constructor (goconfig: GoConfig) {
    this.goconfig = goconfig
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add(
      'atom-text-editor', 'golang:gorename',
      () => this.commandInvoked()
    ))
  }

  dispose () {
    this.subscriptions.dispose()
    this.subscriptions = null
  }

  async commandInvoked () {
    const editor = atom.workspace.getActiveTextEditor()
    if (!isValidEditor(editor)) {
      return
    }
    try {
      const cmd = await this.goconfig.locator.findTool('gorename')
      if (!cmd) {
        return
      }
      const {word, offset} = this.wordAndOffset(editor)
      const cursor = editor.getCursorBufferPosition()

      const dialog = new SimpleDialog({
        prompt: `Rename ${word} to:`,
        initialValue: word,
        onConfirm: (newName) => {
          this.saveAllEditors().then(() => {
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
        },
        onCancel: () => {
          editor.setCursorBufferPosition(cursor, {autoscroll: false})
          const element = atom.views.getView(editor)
          if (element) {
            element.focus()
          }
        }
      })

      dialog.attach()
    } catch (e) {
      if (e.handle) {
        e.handle()
      }
      console.log(e)
    }
  }

  saveAllEditors () {
    const promises = []
    for (const editor of atom.workspace.getTextEditors()) {
      if (editor.isModified() && isValidEditor(editor)) {
        promises.push(editor.save())
      }
    }
    return Promise.all(promises)
  }

  wordAndOffset (editor: any): {word: string, offset: number} {
    const cursor = editor.getLastCursor()
    const range = cursor.getCurrentWordBufferRange()
    const middle = new Point(range.start.row, Math.floor((range.start.column + range.end.column) / 2))
    const charOffset = editor.buffer.characterIndexForPosition(middle)
    const text = editor.getText().substring(0, charOffset)
    return {word: editor.getTextInBufferRange(range), offset: Buffer.byteLength(text, 'utf8')}
  }

  async runGorename (file: string, offset: number, cwd: string, newName: string, cmd: string) {
    if (!this.goconfig || !this.goconfig.executor) {
      return {success: false, result: null}
    }

    const args = ['-offset', `${file}:#${offset}`, '-to', newName]
    const options = {
      cwd: cwd,
      env: this.goconfig.environment(),
      timeout: 20000
    }
    const notification = atom.notifications.addInfo('Renaming...', {
      dismissable: true
    })
    const r = await this.goconfig.executor.exec(cmd, args, options)
    notification.dismiss()
    if (r.exitcode === 124) {
      atom.notifications.addError('Operation timed out', {
        detail: 'gorename ' + args.join(' '),
        dismissable: true
      })
      return {success: false, result: r}
    } else if (r.error) {
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

    const stderr = r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr
    const stdout = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
    const message = stderr.trim() + '\r\n' + stdout.trim()
    if (r.exitcode !== 0 || (stderr && stderr.trim() !== '')) {
      atom.notifications.addWarning('Rename Error', {
        detail: message.trim(),
        dismissable: true
      })
      return {success: false, result: r}
    }

    atom.notifications.addSuccess(message.trim())
    return {success: true, result: r}
  }
}

export {Gorename}
