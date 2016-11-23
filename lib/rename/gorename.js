'use babel'

import path from 'path'
import {CompositeDisposable, Point} from 'atom'
import {RenameDialog} from './rename-dialog'

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
    let editor = atom.workspace.getActiveTextEditor()
    if (!this.isValidEditor(editor)) {
      return
    }
    this.checkForTool(editor).then((cmd) => {
      if (!cmd) {
        // TODO: Show a notification?
        return
      }

      const {word, offset} = this.wordAndOffset(editor)
      let cursor = editor.getCursorBufferPosition()

      let dialog = new RenameDialog(word, (newName) => {
        this.saveAllEditors()
        let file = editor.getBuffer().getPath()
        let cwd = path.dirname(file)

        // restore cursor position after gorename completes and the buffer is reloaded
        if (cursor) {
          let disp = editor.getBuffer().onDidReload(() => {
            editor.setCursorBufferPosition(cursor, {autoscroll: false})
            let element = atom.views.getView(editor)
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
        let element = atom.views.getView(editor)
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
    for (let editor of atom.workspace.getTextEditors()) {
      if (editor.isModified() && this.isValidEditor(editor)) {
        editor.save()
      }
    }
  }

  isValidEditor (editor) {
    if (!editor || !editor.getGrammar()) {
      return false
    }

    return (editor.getGrammar().scopeName === 'source.go')
  }

  wordAndOffset (editor) {
    let cursor = editor.getLastCursor()
    let range = cursor.getCurrentWordBufferRange()
    let middle = new Point(range.start.row,
      Math.floor((range.start.column + range.end.column) / 2))
    let charOffset = editor.buffer.characterIndexForPosition(middle)
    let text = editor.getText().substring(0, charOffset)
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

      let message = r.stderr.trim() + '\r\n' + r.stdout.trim()
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

    let options = {}
    if (editor && editor.getPath()) {
      options.file = editor.getPath()
      options.directory = path.dirname(options.file)
    }

    if (!options.directory && atom.project.getPaths().length > 0) {
      options.directory = atom.project.getPaths()[0]
    }

    return this.goconfig.locator.findTool('gorename', options).then((cmd) => {
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
          return this.goconfig.locator.findTool('gorename', options)
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
