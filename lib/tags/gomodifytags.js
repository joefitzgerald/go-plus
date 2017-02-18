'use babel'

import {CompositeDisposable, Point} from 'atom'
import {isValidEditor} from '../utils'
import TagsDialog from './tags-dialog'

export default class GoModifyTags {
  constructor (goconfig) {
    this.goconfig = goconfig
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add(
      'atom-workspace', 'golang:add-tags',
      () => this.commandInvoked('Add')
    ))
    this.subscriptions.add(atom.commands.add(
      'atom-workspace', 'golang:remove-tags',
      () => this.commandInvoked('Remove')
    ))
  }

  dispose () {
    this.subscriptions.dispose()
    this.subscriptions = null
    this.goconfig = null
  }

  commandInvoked (mode) {
    const editor = atom.workspace.getActiveTextEditor()
    if (!isValidEditor(editor)) {
      return
    }

    if (editor.hasMultipleCursors()) {
      atom.notifications.addWarning('go-plus', {
        dismissable: true,
        icon: 'tag',
        detail: 'Modifying tags only works with a single cursor'
      })
      return
    }

    return this.goconfig.locator.findTool('gomodifytags').then((cmd) => {
      const dialog = new TagsDialog({
        mode: mode
      })
      dialog.onAccept = (options) => this.modifyTags(editor, options, mode, cmd)
      dialog.attach()
    })
  }

  modifyTags (editor, options, mode, cmd) {
    const {tags, useSnakeCase, sortTags} = options
    const executorOptions = this.goconfig.executor.getOptions('file')

    // if there is a selection, use the -line flag,
    // otherwise just use the cursor offset (and apply modifications to entire struct)
    const args = ['-file', editor.getTitle()]
    const selection = editor.getSelectedBufferRange()
    if (selection && !selection.start.isEqual(selection.end)) {
      args.push('-line')
      if (selection.isSingleLine()) {
        args.push(`${selection.start.row + 1}`)
      } else {
        args.push(`${selection.start.row + 1},${selection.end.row + 1}`)
      }
    } else {
      args.push('-offset')
      args.push(this.editorByteOffset(editor))
    }

    if (editor.isModified()) {
      let archive = ''
      archive += editor.getTitle() + '\n'
      archive += Buffer.byteLength(editor.getText(), 'utf8') + '\n'
      archive += editor.getText()

      args.push('-modified')
      executorOptions.input = archive
    }

    args.push('-w')
    // args.push('-format')
    // args.push('json')

    if (!useSnakeCase) {
      args.push('-transform')
      args.push('camelcase')
    }
    if (sortTags) {
      args.push('-sort')
    }

    if (mode === 'Add') {
      const tagNames = []
      const opts = []
      for (const t of tags) {
        tagNames.push(t.tag)
        if (t.option && t.option.length) {
          opts.push(`${t.tag}=${t.option}`)
        }
      }
      if (opts.length > 0) {
        args.push('-add-options')
        args.push(opts.join(','))
      } else {
        if (tagNames.length === 0) {
          tagNames.push('json')
        }
        args.push('-add-tags', tagNames.join(','))
      }
    } else if (mode === 'Remove') {
      const tagNames = []
      const opts = []
      if (!tags || !tags.length) {
        args.push('-clear-tags')
      } else {
        for (const t of tags) {
          tagNames.push(t.tag)
          if (t.option && t.option.length) {
            opts.push(`${t.tag}=${t.option}`)
          }
        }
        if (tagNames.length > 0) {
          args.push('-remove-tags')
          args.push(tagNames.join(','))
        }
        if (opts.length > 0) {
          args.push('remove-options')
          args.push(opts.join(','))
        }
      }
    }
    if (atom.inDevMode()) {
      console.log('(go-plus): executing: gomodifytags ' + args.join(' '))
    }
    return this.goconfig.executor.exec(cmd, args, executorOptions).then((r) => {
      if (r.error) {
        if (r.error && r.error.code === 'ENOENT') {
          atom.notifications.addError('Missing Tool', {
            detail: 'Missing the `gomodifytags` tool.',
            dismissable: true
          })
        } else {
          atom.notifications.addError('Error', {
            detail: r.error.message,
            dismissable: true
          })
        }
        return {success: false, result: r}
      } else if (r.exitcode !== 0) {
        atom.notifications.addError('Error', {
          detail: r.stderr.trim(),
          dismissable: true
        })
      }
      // const result = JSON.parse(r.stdout.trim())
      // if (result) {
      //   editor.transact(() => {
      //
      //   })
      //   return {success: true, result: r}
      // }
      return {success: true, result: r}
    })
  }

  editorByteOffset (editor) {
    const cursor = editor.getLastCursor()
    const range = cursor.getCurrentWordBufferRange()
    const middle = new Point(range.start.row, Math.floor((range.start.column + range.end.column) / 2))
    const charOffset = editor.buffer.characterIndexForPosition(middle)
    const text = editor.getText().substring(0, charOffset)
    return Buffer.byteLength(text, 'utf8')
  }
}
