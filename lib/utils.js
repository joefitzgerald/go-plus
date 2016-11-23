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

export { isValidEditor }
