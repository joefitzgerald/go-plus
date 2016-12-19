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

export { isValidEditor, getEditor, projectPath, openFile }
