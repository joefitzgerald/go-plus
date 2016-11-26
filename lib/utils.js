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

export { isValidEditor, getEditor }
