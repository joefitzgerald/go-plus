// @flow

import { CompositeDisposable } from 'atom'
import { isValidEditor, wordAndOffset } from '../utils'
import { buildGuruArchive } from '../guru-utils'
import { TagsDialog } from './tags-dialog'

import type { GoConfig } from './../config/service'

type Mode = 'Add' | 'Remove'

export type Tag = {
  tag: string,
  option?: string
}

export type GoModifyTagsOptions = {
  tags: Array<Tag>,
  transform: 'snakecase' | 'camelcase', // | 'lispcase',
  sortTags: boolean
}

class GoModifyTags {
  goconfig: GoConfig
  subscriptions: CompositeDisposable

  constructor(goconfig: GoConfig) {
    this.goconfig = goconfig
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(
      atom.commands.add('atom-workspace', 'golang:add-tags', () =>
        this.commandInvoked('Add')
      )
    )
    this.subscriptions.add(
      atom.commands.add('atom-workspace', 'golang:remove-tags', () =>
        this.commandInvoked('Remove')
      )
    )
  }

  dispose() {
    this.subscriptions.dispose()
  }

  async commandInvoked(mode: Mode) {
    const editor = atom.workspace.getActiveTextEditor()
    if (!editor || !isValidEditor(editor)) {
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
    const cmd = await this.goconfig.locator.findTool('gomodifytags')
    if (cmd) {
      const dialog = new TagsDialog({
        mode: mode
      })
      const c: string = cmd
      dialog.onAccept = options => this.modifyTags(editor, options, mode, c)
      dialog.attach()
    }
  }

  buildArgs(
    editor: TextEditor,
    options: GoModifyTagsOptions,
    mode: Mode
  ): Array<string> {
    const { tags, transform, sortTags } = options

    // if there is a selection, use the -line flag,
    // otherwise just use the cursor offset (and apply modifications to entire struct)
    const args = ['-file', editor.getPath() || '']
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
      args.push(wordAndOffset(editor).offset.toString())
    }

    if (editor.isModified()) {
      args.push('-modified')
    }

    if (transform) {
      args.push('-transform')
      args.push(transform)
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
      }
      if (tagNames.length === 0) {
        tagNames.push('json')
      }
      args.push('-add-tags', tagNames.join(','))
    } else if (mode === 'Remove') {
      const tagNames = []
      const opts = []
      if (!tags || !tags.length) {
        args.push('-clear-tags')
      } else {
        for (const t of tags) {
          if (t.option && t.option.length) {
            opts.push(`${t.tag}=${t.option}`)
          } else {
            tagNames.push(t.tag)
          }
        }
        if (tagNames.length > 0) {
          args.push('-remove-tags')
          args.push(tagNames.join(','))
        }
        if (opts.length > 0) {
          args.push('-remove-options')
          args.push(opts.join(','))
        }
      }
    }
    return args
  }

  async modifyTags(
    editor: TextEditor,
    options: GoModifyTagsOptions,
    mode: Mode,
    cmd: string
  ) {
    const executorOptions = this.goconfig.executor.getOptions('file', editor)

    if (editor.isModified()) {
      executorOptions.input = buildGuruArchive(editor)
    }

    const args = this.buildArgs(editor, options, mode)
    const r = await this.goconfig.executor.exec(cmd, args, executorOptions)
    if (r.error) {
      if (r.error.code === 'ENOENT') {
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
      return { success: false, result: r }
    } else if (r.exitcode !== 0) {
      const stderr = r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr
      atom.notifications.addError('Error', {
        detail: stderr.trim(),
        dismissable: true
      })
      return { success: false, result: r }
    }
    editor.getBuffer().setTextViaDiff(r.stdout.toString())
    return { success: true, result: r }
  }
}

export { GoModifyTags }
