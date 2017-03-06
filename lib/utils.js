'use babel'

function isValidEditor (e) {
  if (!e || !e.getGrammar()) {
    return false
  }
  const grammar = e.getGrammar()
  if (!grammar) {
    return false
  }
  return grammar.scopeName === 'source.go'
}

function getEditor () {
  if (!atom || !atom.workspace) {
    return
  }
  const editor = atom.workspace.getActiveTextEditor()
  if (!isValidEditor(editor)) {
    return
  }

  return editor
}

function getWordPosition (editor = getEditor()) {
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

function getCursorPosition (editor = getEditor()) {
  if (!editor) {
    return undefined
  }
  const cursor = editor.getLastCursor()
  if (!cursor) {
    return undefined
  }
  return cursor.getBufferPosition()
}

function currentCursorOffset (editor = getEditor()) {
  if (!editor) {
    return undefined
  }

  const pos = getCursorPosition()
  if (!pos) {
    return undefined
  }

  return utf8OffsetForBufferPosition(pos, editor)
}

function utf8OffsetForBufferPosition (pos, editor = getEditor()) {
  if (!editor || !editor.getBuffer() || !pos) {
    return
  }
  const characterOffset = editor.getBuffer().characterIndexForPosition(pos)
  const text = editor.getText().substring(0, characterOffset)
  return Buffer.byteLength(text, 'utf8')
}

/**
 * Opens the `file` and centers the editor around the `pos`
 * @param  {string} file  Path to the file to open.
 * @param  {object} [pos] An optional object containing `row` and `column` to scroll to.
 * @return {Promise} Returns a promise which resolves with the opened editor
 */
function openFile (file, pos) {
  // searchAllPanes avoids opening a file in another split pane if it is already open in one
  const options = { searchAllPanes: true }
  if (pos && pos.row) {
    options.initialLine = pos.row
  }
  if (pos && pos.column) {
    options.initialColumn = pos.column
  }
  return atom.workspace.open(file, options).then((editor) => {
    if (pos) {
      editor.scrollToBufferPosition(pos, { center: true })
    }
    return editor
  })
}

function projectPath () {
  const paths = atom.project.getPaths()
  if (paths && paths.length) {
    for (const p of paths) {
      if (p && !p.includes('://')) {
        return p
      }
    }
  }
  return undefined
}

function parseGoPosition (identifier) {
  if (!identifier || !identifier.length > 1) {
    return undefined
  }

  if (!identifier.includes(':')) {
    return {file: identifier, line: false, column: false}
  }

  let windows = false
  if (identifier[1] === ':') {
    windows = true
  }

  let hasFile = true
  let hasColumn = false
  let hasLine = false
  let file = false
  let line = false
  let column = false
  const components = identifier.trim().split(':')
  if (windows) {
    if (components.length >= 2) {
      hasFile = true
    }
    if (components.length >= 3) {
      hasLine = true
    }
    if (components.length > 3) {
      hasColumn = true
    }
  } else {
    if (components.length >= 1) {
      hasFile = true
    }
    if (components.length >= 2) {
      hasLine = true
    }
    if (components.length > 2) {
      hasColumn = true
    }
  }

  if (hasColumn) {
    column = parseInt(components.pop(), 10)
  }
  if (hasLine) {
    line = parseInt(components.pop(), 10)
  }
  if (hasFile) {
    file = components.join(':')
  }

  return {file: file, line: line, column: column}
}

export { isValidEditor, getEditor, projectPath, openFile, getWordPosition, utf8OffsetForBufferPosition, currentCursorOffset, getCursorPosition, parseGoPosition }
