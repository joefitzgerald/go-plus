// @flow

import os from 'os'
import { Point, Range } from 'atom'
import { buildGuruArchive, computeArgs } from './../guru-utils'
import {
  parseGoPosition,
  isValidEditor,
  utf8OffsetForBufferPosition
} from './../utils'

import type { GoConfig } from './../config/service'

type Reference = {
  uri: string,
  name: ?string, // name of calling method/function/symbol
  range: atom$Range
}

type FindReferencesData = {
  type: 'data',
  baseUri: string,
  referencedSymbolName: string,
  references: Array<Reference>,
  title?: string // defaults to 'Symbol References'
}

type FindReferencesError = {
  type: 'error',
  message: string
}

type FindReferencesReturn = FindReferencesData | FindReferencesError

class ReferencesProvider {
  goconfig: GoConfig

  constructor(goconfig: GoConfig) {
    this.goconfig = goconfig
  }

  isEditorSupported(editor: TextEditor): Promise<boolean> {
    return Promise.resolve(isValidEditor(editor))
  }

  getWordAtPosition(editor: TextEditor, pos: atom$Point) {
    const cursor = editor.getLastCursor()
    const wordRegexp = cursor.wordRegExp()
    // $FlowFixMe
    const ranges = editor
      .getBuffer()
      .findAllInRangeSync(
        wordRegexp,
        new Range(new Point(pos.row, 0), new Point(pos.row, Infinity))
      )
    const range =
      ranges.find(
        range =>
          range.end.column >= pos.column && range.start.column <= pos.column
      ) || new Range(pos, pos)

    return editor.getTextInBufferRange(range)
  }

  async findReferences(
    editor: TextEditor,
    position: atom$Point
  ): Promise<?FindReferencesReturn> {
    const cmd = await this.goconfig.locator.findTool('guru')
    if (!cmd) {
      return {
        type: 'error',
        message: 'Cannot find references. The `guru` tool could not be located.'
      }
    }

    const offset = utf8OffsetForBufferPosition(position, editor)
    const args = computeArgs('referrers', null, editor, offset) || []
    const options = {}
    options.timeout = 30000
    const archive = buildGuruArchive(editor)
    if (archive && archive.length) {
      options.input = archive
      args.unshift('-modified')
    }

    const r = await this.goconfig.executor.exec(cmd, args, options)
    const stderr = r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr
    const stdout = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
    if (r.error || r.exitcode !== 0) {
      let message
      if (r.exitcode === 124) {
        message = `operation timed out after ${options.timeout}ms`
      } else {
        message = stderr.trim() + os.EOL + stdout.trim()
        if (r.error && r.error.message) {
          message = r.error.message + os.EOL + message
        }
      }
      return { type: 'error', message }
    }

    const stream = this.parseStream(stdout)
    const refs = this.parse(stream)
    return {
      type: 'data',
      baseUri: atom.project.getDirectories()[0].getPath(),
      references: refs,
      referencedSymbolName:
        this.getWordAtPosition(editor, position) || stream[0].desc
    }
  }

  parseStream(jsonStream: string): Array<Object> {
    if (!jsonStream || !jsonStream.length) {
      return []
    }
    // A JSON stream is invalid json; characterized by a concatenation of
    // multiple JSON objects
    const r = new RegExp('^}$', 'igm')
    const result = []
    const objects = jsonStream.split(r)
    for (const obj of objects) {
      if (obj.trim() !== '') {
        result.push(JSON.parse(obj + '}'))
      }
    }
    return result
  }

  parse(obj: Array<Object>): Array<Reference> {
    if (!obj || !obj.length) {
      return []
    }

    const refs: Array<Reference> = []
    for (const pkg of obj.slice(1)) {
      if (!pkg || !pkg.refs || !pkg.refs.length) {
        continue
      }

      for (const ref of pkg.refs) {
        const parsed = parseGoPosition(ref.pos)
        if (
          parsed &&
          typeof parsed.column === 'number' &&
          typeof parsed.line === 'number'
        ) {
          const point = [parsed.line, parsed.column]
          refs.push({
            uri: parsed.file,
            range: new Range(point, point),
            name: ref.text
          })
        }
      }
    }

    return refs
  }
}

export { ReferencesProvider }
