// @flow

import { CompositeDisposable, Range } from 'atom'
import { utf8OffsetForBufferPosition, parseGoPosition } from './../utils'
import {
  buildGuruArchive,
  computeArgs,
  adjustPositionForGuru
} from './../guru-utils'

import type { GoConfig } from './../config/service'

class HighlightProvider {
  goconfig: GoConfig
  running: boolean
  subscriptions: CompositeDisposable
  shouldDecorate: boolean
  priority: number = 2
  grammarScopes: Array<string> = ['source.go', 'go']

  constructor(goconfig: GoConfig) {
    this.subscriptions = new CompositeDisposable()
    this.goconfig = goconfig
    this.running = false
    this.subscriptions.add(
      atom.config.observe('go-plus.guru.highlightIdentifiers', v => {
        this.shouldDecorate = v
      })
    )
  }

  async highlight(
    editor: atom$TextEditor,
    bufferPosition: atom$Point
  ): Promise<?Array<atom$Range>> {
    if (this.running) return null
    if (!this.shouldDecorate) return null

    const pos = adjustPositionForGuru(bufferPosition, editor)
    const offset = utf8OffsetForBufferPosition(pos, editor)
    const args = computeArgs('what', null, editor, offset)
    if (!args) return null

    const options = {}
    options.timeout = 30000
    const archive = buildGuruArchive(editor)
    if (archive && archive.length) {
      options.input = archive
      args.unshift('-modified')
    }

    const cmd = await this.goconfig.locator.findTool('guru')
    if (!cmd) return null

    this.running = true
    try {
      const r = await this.goconfig.executor.exec(cmd, args, options)
      if (r.exitcode !== 0) return null

      const stdout = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
      const result = JSON.parse(stdout)

      const ranges: Array<atom$Range> = []
      let length = 0
      for (const enclosing of result.enclosing) {
        if (enclosing.desc === 'identifier') {
          length = enclosing.end - enclosing.start
          break
        }
      }
      for (const id of result.sameids) {
        const parsed = parseGoPosition(id)
        if (
          parsed &&
          typeof parsed.column === 'number' &&
          typeof parsed.line === 'number'
        ) {
          const start = [parsed.line - 1, parsed.column - 1]
          ranges.push(new Range(start, [start[0], start[1] + length]))
        }
      }
      return ranges
    } finally {
      this.running = false
    }
  }

  dispose() {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.running = false
  }
}

export { HighlightProvider }
