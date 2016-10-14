'use babel'
/* eslint-env jasmine */

import path from 'path'

describe('builder', () => {
  let mainModule = null
  let builder = null

  beforeEach(() => {
    waitsForPromise(() => {
      return atom.packages.activatePackage('go-config').then(() => {
        return atom.packages.activatePackage('language-go')
      }).then(() => {
        return atom.packages.activatePackage('go-plus')
      }).then((pack) => {
        mainModule = pack.mainModule
      })
    })

    waitsFor(() => {
      return mainModule.goconfig
    })

    waitsFor(() => {
      builder = mainModule.getBuilder()
      return builder
    })
  })

  describe('getMessages', () => {
    it('ignores duplicate errors', () => {
      // GIVEN the same results from both 'go install' and 'go test'
      let outputs = [
        {
          'output': '# github.com/anonymous/sample-project\n.\\the-file.go:12: syntax error: unexpected semicolon or newline, expecting comma or }',
          'linterName': 'build'
        },
        {
          'output': '# github.com/anonymous/sample-project\n.\\the-file.go:12: syntax error: unexpected semicolon or newline, expecting comma or }',
          'linterName': 'test'
        }
      ]

      // WHEN I get the messages for these outputs
      let messages = builder.getMessages(outputs, path.join('src', 'github.com', 'anonymous', 'sample-project'))

      // THEN I expect only one message to be returned because they are the same
      expect(messages.length).toEqual(1)

      let message = messages[0]
      expect(message.name).toEqual('build')
      expect(message.text.indexOf('syntax error: unexpected semicolon or newline, expecting comma or }') === 0).toBeTruthy()
      expect(message.filePath.indexOf('the-file.go') > 0).toBeTruthy() // file is in the path
      expect(message.filePath.indexOf('sample-project') > 0).toBeTruthy() // cwd is in the path
      expect(message.row).toEqual('12')
    })
  })
})
