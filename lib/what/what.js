'use babel'

import {CompositeDisposable} from 'atom'
import {utf8OffsetForBufferPosition} from './../utils'
import {buildGuruArchive, computeArgs, adjustPositionForGuru} from './../guru-utils'
import os from 'os'

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
      if (!editor || !editor.getBuffer()) {
        return
      }

      const editorSubscriptions = new CompositeDisposable()
      editorSubscriptions.add(editor.onDidChangeCursorPosition(({cursor, newBufferPosition}) => {
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

  // parseStream (jsonStream) {
  //   if (!jsonStream || !jsonStream.length) {
  //     return []
  //   }
  //   // A JSON stream is invalid json; characterized by a concatenation of
  //   // multiple JSON objects
  //   const r = new RegExp('^}$', 'igm')
  //   const result = []
  //   const objects = jsonStream.split(r)
  //   for (const obj of objects) {
  //     if (obj.trim() !== '') {
  //       result.push(JSON.parse(obj + '}'))
  //     }
  //   }
  //   return result
  // }
  //
  // parse (obj) {
  //   if (!obj) {
  //     return undefined
  //   }
  //
  //   if (obj.length < 2) {
  //     return undefined
  //   }
  //
  //   const result = new Map()
  //   for (const pkg of obj.slice(1)) {
  //     if (!pkg || !pkg.refs || !pkg.refs.length) {
  //       continue
  //     }
  //     const refs = []
  //     for (const ref of pkg.refs) {
  //       const components = ref.pos.split(':')
  //       const filename = components[0]
  //       const row = components[1]
  //       const column = components[2]
  //       const text = ref.text
  //       refs.push({filename, row, column, text})
  //     }
  //     result.set(pkg.package, refs)
  //   }
  //   return {initial: obj[0], packages: result}
  // }

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
    // TODO: clear markers
    if (!this.goconfig || !this.goconfig.executor || !editor || !pos || !cursor) {
      this.running = false
      return
    }

    pos = adjustPositionForGuru(pos, editor)
    const offset = utf8OffsetForBufferPosition(pos, editor)
    const args = computeArgs('what', editor, offset)
    const options = {timeout: 30000}
    const archive = buildGuruArchive()
    if (archive && archive.length) {
      options.input = archive
      args.unshift('-modified')
    }
    return this.goconfig.executor.exec('guru', args, options).then((r) => { // TODO locator?
      if (r.exitcode !== 0) {
        this.running = false
        console.log(r)
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
            const components = sameid.split(':')
            if (components.length !== 3) {
              continue
            }
            const start = [parseInt(components[1]) - 1, parseInt(components[2]) - 1]
            this.currentEditorLayer.markBufferRange([start, [start[0], start[1] + length]], {invalidate: 'touch'})
          }

          editor.decorateMarkerLayer(this.currentEditorLayer, {type: 'highlight', class: 'sameid', onlyNonEmpty: true})
        }
      }
      this.running = false
      return result
    })
  }

  // exec (args) {
  //   if (!this.goconfig || !this.goconfig.executor) {
  //     return
  //   }
  //
  //   const options = {timeout: 30000}
  //   const archive = buildGuruArchive()
  //   if (archive && archive.length) {
  //     options.input = archive
  //     args.unshift('-modified')
  //   }
  //   this.updateContent('Running guru ' + args.join(' ') + '...', 'running')
  //   return this.goconfig.executor.exec('guru', args, options).then((r) => {
  //     const message = r.message + os.EOL + r.stderr.trim() + os.EOL + r.stdout.trim()
  //     if (r.error) {
  //       this.updateContent('guru ' + args.join(' ') + '...', 'failed:' + os.EOL + message, 'error')
  //       return false
  //     }
  //
  //     if (r.exitcode !== 0 || r.stderr && r.stderr.trim() !== '') {
  //       this.updateContent('guru ' + args.join(' ') + '...', 'failed:' + os.EOL + message, 'error')
  //       return false
  //     }
  //
  //     this.updateContent(this.parse(this.parseStream(r.stdout)), 'success')
  //     return true
  //   })
  // }
}

export {What}
