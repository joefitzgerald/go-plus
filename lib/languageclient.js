// @flow

import { AutoLanguageClient } from 'atom-languageclient'
import { spawn } from 'child_process'

class GoLanguageClient extends AutoLanguageClient {
  getGrammarScopes(): Array<string> {
    return ['source.go', 'go']
  }

  getLanguageName(): string {
    return 'Go'
  }

  getServerName(): string {
    return 'gopls'
  }

  getConnectionType(): string {
    return 'stdio'
  }

  startServerProcess() {
    return spawn('gopls', ['serve'])
  }
}

module.exports = new GoLanguageClient()
