// @flow
'use babel'

import path from 'path'
import {getEditor, getCursorPosition, isValidEditor, utf8OffsetForBufferPosition} from './utils'

const scopedModes = ['callees', 'callers', 'callstack', 'pointsto', 'whicherrs', 'peers']

function buildGuruArchive (editor: any = null) {
  let archive = ''
  const editors = editor ? [editor] : atom.workspace.getTextEditors()
  for (const e of editors) {
    if (e.isModified() && isValidEditor(e)) {
      archive += e.getPath() + '\n'
      archive += Buffer.byteLength(e.getText(), 'utf8') + '\n'
      archive += e.getText()
    }
  }
  return archive
}

function computeArgs (mode: string, options: ?{gopath: string}, editor: any = getEditor(), pos: number = currentCursorOffset(editor)): ?Array<string> {
  if (!mode || !editor || (!pos && pos !== 0)) {
    return undefined
  }

  const filePath = editor.getPath()
  const args = ['-json']
  if (scopedModes.includes(mode)) {
    let relPath = atom.project.relativizePath(filePath)
    if (relPath && relPath.length > 0 && relPath[0] !== null) {
      // Make it relative to GOPATH because guru tool requires it.
      if (options && options.gopath && options.gopath.length) {
        const scope = path.relative(options.gopath + '/src', relPath[0] + '/...')
        args.push('-scope', scope)
      }
    }
  }

  args.push(mode, `${filePath}:#${pos}`)
  return args
}

function currentCursorOffset (editor: any = getEditor()): number {
  const pos = adjustPositionForGuru(getCursorPosition(), editor)
  return utf8OffsetForBufferPosition(pos, editor)
}

function adjustPositionForGuru (pos: any = getCursorPosition(), editor: any = getEditor()) {
  if (!pos) {
    return pos
  }
  // Unfortunately guru fails if the cursor is at the end of a word
  // e.g. "fmt.Println ()"
  //                  ↑ the cursor is here, between "ln" and "("
  // In order to avoid this problem we have to check whether the char
  // at the given position is considered a part of an identifier.
  // If not step back 1 char as it might contain a valid identifier.
  const char = editor.getTextInBufferRange([
    pos,
    pos.translate([0, 1])
  ])
  const nonWordChars = editor.getNonWordCharacters(
    editor.scopeDescriptorForBufferPosition(pos)
  )
  if (nonWordChars.indexOf(char) >= 0 || /\s/.test(char)) {
    return pos.translate([0, -1])
  }
  return pos
}

export { adjustPositionForGuru, buildGuruArchive, currentCursorOffset, computeArgs }
