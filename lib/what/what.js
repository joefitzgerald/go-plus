'use babel'

import {CompositeDisposable} from 'atom'
import {utf8OffsetForBufferPosition, isValidEditor, parseGoPosition} from './../utils'
import {buildGuruArchive, computeArgs, adjustPositionForGuru} from './../guru-utils'

class What {
  constructor (goconfig) {
    this.subscriptions = new CompositeDisposable()
    this.goconfig = goconfig
    this.running = false
    this.subscriptions.add(atom.config.observe('go-plus.guru.highlightIdentifiers', (v) => {
      this.shouldDecorate = v
      if (this.shouldDecorate) {
        this.subscribeToCursorEvents()
      } else {
        this.unsubscribeToCursorEvents()
      }
    }))
  }

  dispose () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    this.unsubscribeToCursorEvents()
    this.goconfig = null
    this.running = false
  }

  subscribeToCursorEvents () {
    this.cursorSubscriptions = new CompositeDisposable()
    this.cursorSubscriptions.add(atom.workspace.observeTextEditors((editor) => {
      if (!isValidEditor(editor) || !editor.getBuffer()) {
        return
      }

      const editorSubscriptions = new CompositeDisposable()
      editorSubscriptions.add(editor.onDidChangeCursorPosition(({cursor, newBufferPosition}) => {
        if (!cursor || !cursor.selection) {
          return
        }

        const selection = cursor.selection.getBufferRange()
        if (!selection || !selection.start || !selection.end) {
          return
        }

        if (selection.start.compare(selection.end) === -1) {
          this.clearMarkers()
          return // The user has selected a range of text, suppress highlighting
        }

        this.run(editor, newBufferPosition, cursor, this.shouldDecorate)
      }))
      editorSubscriptions.add(editor.onDidDestroy(() => {
        editorSubscriptions.dispose()
        this.currentEditorLayer = null
      }))
      this.cursorSubscriptions.add(editorSubscriptions)
    }))
  }

  unsubscribeToCursorEvents () {
    this.clearMarkers()
    if (this.cursorSubscriptions) {
      this.cursorSubscriptions.dispose()
      this.cursorSubscriptions = null
    }
  }

  clearMarkers () {
    if (this.currentEditorLayer) {
      this.currentEditorLayer.destroy()
      this.currentEditorLayer = null
    }
  }

  run (editor, pos, cursor, shouldDecorate) {
    if (this.running) {
      return
    }

    this.running = true
    this.clearMarkers()
    if (!this.goconfig || !this.goconfig.executor || !editor || !pos || !cursor) {
      this.running = false
      return
    }

    pos = adjustPositionForGuru(pos, editor)
    const offset = utf8OffsetForBufferPosition(pos, editor)
    const args = computeArgs('what', {}, editor, offset)
    const options = {timeout: 30000}
    const archive = buildGuruArchive()
    if (archive && archive.length) {
      options.input = archive
      args.unshift('-modified')
    }
    return this.goconfig.locator.findTool('guru').then((cmd) => {
      if (!cmd) {
        console.log('missing guru tool')
        return
      }
      if (!this.goconfig) {
        return
      }
      return this.goconfig.executor.exec(cmd, args, options).then((r) => {
        if (r.exitcode !== 0) {
          this.running = false
          return
        }
        let result
        try {
          result = JSON.parse(r.stdout)
        } catch (e) {
          console.log(e)
          this.running = false
          return
        }

        if (!result) {
          this.running = false
          return
        }

        if (shouldDecorate && result) {
          if (result.enclosing && result.enclosing.length && result.sameids && result.sameids.length) {
            let length = 0
            for (const enclosing of result.enclosing) {
              if (enclosing.desc === 'identifier') {
                length = enclosing.end - enclosing.start
                break
              }
            }
            this.currentEditorLayer = editor.addMarkerLayer()

            for (const sameid of result.sameids) {
              const parsed = parseGoPosition(sameid)
              if (!parsed) {
                continue
              }
              const start = [parsed.line - 1, parsed.column - 1]
              this.currentEditorLayer.markBufferRange([start, [start[0], start[1] + length]], {invalidate: 'touch'})
            }

            editor.decorateMarkerLayer(this.currentEditorLayer, {type: 'highlight', class: 'sameid', onlyNonEmpty: true})
          }
        }
        this.running = false
        return result
      })
    })
  }
}

export {What}
