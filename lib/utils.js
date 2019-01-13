// @flow

import fs from 'fs'
import { TextEditor, Point } from 'atom'

const isValidEditor = (e: ?TextEditor): boolean %checks => {
  return !!e && hasGoGrammar(e.getGrammar())
}

const hasGoGrammar = (g: ?atom$Grammar): boolean %checks => {
  return !!g && (g.scopeName === 'source.go' || g.scopeName === 'go')
}

const getEditor = (): ?TextEditor => {
  if (!atom || !atom.workspace) {
    return
  }
  const editor = atom.workspace.getActiveTextEditor()
  if (!isValidEditor(editor)) {
    return
  }

  return editor
}

const getWordPosition = (
  editor: ?TextEditor = getEditor()
): ?atom$PointLike => {
  if (!editor) {
    return undefined
  }

  const cursor = editor.getLastCursor()
  const buffer = editor.getBuffer()

  if (!cursor || !buffer) {
    return undefined
  }

  let wordPosition = cursor.getCurrentWordBufferRange()
  let start = buffer.characterIndexForPosition(wordPosition.start)
  let end = buffer.characterIndexForPosition(wordPosition.end)
  return [start, end]
}

const getCursorPosition = (editor: TextEditor) => {
  if (!editor) {
    return undefined
  }
  const cursor = editor.getLastCursor()
  if (!cursor) {
    return undefined
  }
  return cursor.getBufferPosition()
}

const currentCursorOffset = (editor: TextEditor) => {
  if (!editor) {
    return undefined
  }

  const pos = getCursorPosition(editor)
  if (!pos) {
    return undefined
  }

  return utf8OffsetForBufferPosition(pos, editor)
}

const utf8OffsetForBufferPosition = (
  pos: atom$PointLike,
  editor: TextEditor
): number => {
  if (!editor || !editor.getBuffer() || !pos) {
    return -1
  }
  const characterOffset = editor.getBuffer().characterIndexForPosition(pos)
  const text = editor.getText().substring(0, characterOffset)
  return Buffer.byteLength(text, 'utf8')
}

const wordAndOffset = (
  editor: TextEditor
): { word: string, offset: number } => {
  const cursor = editor.getLastCursor()
  const range = cursor.getCurrentWordBufferRange()
  const middle = new Point(
    range.start.row,
    Math.floor((range.start.column + range.end.column) / 2)
  )
  const charOffset = editor.getBuffer().characterIndexForPosition(middle)
  const text = editor.getText().substring(0, charOffset)
  return {
    word: editor.getTextInBufferRange(range),
    offset: Buffer.byteLength(text, 'utf8')
  }
}

/**
 * Opens the `file` and centers the editor around the `pos`
 * @param  {string} file  Path to the file to open.
 * @param  {object} [pos] An optional object containing `row` and `column` to scroll to.
 * @return {Promise} Returns a promise which resolves with the opened editor
 */
const openFile = async (
  file: string,
  pos?: ?atom$Point
): Promise<TextEditor> => {
  await new Promise((resolve, reject) => {
    fs.access(file, fs.constants.F_OK | fs.constants.R_OK, err => {
      if (err) {
        reject(err)
        return
      }
      resolve()
    })
  })
  // searchAllPanes avoids opening a file in another split pane if it is already open in one
  const options = {}
  options.searchAllPanes = true
  if (pos && pos.row) {
    options.initialLine = pos.row
  }
  if (pos && pos.column) {
    options.initialColumn = pos.column
  }
  const editor = await atom.workspace.open(file, options)
  if (pos) {
    editor.scrollToBufferPosition(pos, { center: true })
  }
  return editor
}

const stat = (loc: string): Promise<fs.Stats> => {
  return new Promise((resolve, reject) => {
    fs.stat(loc, (err, stats) => {
      if (err) {
        reject(err)
      }
      resolve(stats)
    })
  })
}

const projectPath = (): ?string => {
  const dirs = atom.project
    .getDirectories()
    .filter(dir => !dir.getPath().includes('://'))
  if (dirs && dirs.length > 0) {
    return dirs[0].getPath()
  }
  return undefined
}

export type GoPos = {
  file: string,
  line?: number,
  column?: number
}

const parseGoPosition = (identifier: string): GoPos => {
  if (!identifier.includes(':')) {
    return { file: identifier }
  }

  const windows = identifier[1] === ':'
  const offset = windows ? 1 : 0

  const components = identifier.trim().split(':')
  const hasLine = components.length >= 2 + offset
  const hasColumn = components.length > 2 + offset

  const column = hasColumn ? parseInt(components.pop(), 10) : undefined
  const line = hasLine ? parseInt(components.pop(), 10) : undefined
  const file = components.join(':')

  return { file, line, column }
}

export {
  isValidEditor,
  getEditor,
  projectPath,
  openFile,
  getWordPosition,
  utf8OffsetForBufferPosition,
  wordAndOffset,
  currentCursorOffset,
  getCursorPosition,
  parseGoPosition,
  stat
}
