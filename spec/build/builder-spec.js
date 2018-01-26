'use babel'
/* eslint-env jasmine */

import path from 'path'
import {lifecycle} from './../spec-helpers'

describe('builder', () => {
  let builder = null
  let linter

  beforeEach(() => {
    lifecycle.setup()

    // mock the Linter V1 Indie API
    linter = {
      deleteMessages: () => {},
      setMessages: (messages) => {},
      dispose: () => {}
    }

    waitsForPromise(() => {
      return lifecycle.activatePackage()
    })

    waitsFor(() => {
      builder = lifecycle.mainModule.loadBuilder(linter)
      return builder
    })
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  describe('test executable', () => {
    it('provides a standard set of flags for compilation', () => {
      ['', '   '].forEach(setting => {
        const args = builder.testCompileArgs(setting)
        expect(args[0]).toEqual('test')
        expect(args).toContain('-c')
        expect(args).toContain('-i')
        expect(args).toContain('-o')
        expect(args.includes('/dev/null') || args.includes('NUL')).toEqual(true)
        expect(args).toContain('.')
      })
    })

    it('includes additional args', () => {
      const args = builder.testCompileArgs('-foo -bar 5')
      expect(args[0]).toEqual('test')
      expect(args).toContain('-c')
      expect(args).toContain('-i')
      expect(args).toContain('-o')
      expect(args.includes('/dev/null') || args.includes('NUL')).toEqual(true)
      expect(args).toContain('.')
      expect(args).toContain('-foo')
      expect(args).toContain('-bar')
      expect(args).toContain('5')
    })

    it('puts additional args before the package path', () => {
      const args = builder.testCompileArgs('-foo')
      const dot = args.indexOf('.')
      const foo = args.indexOf('-foo')
      expect(dot).not.toEqual(-1)
      expect(foo).not.toEqual(-1)
      expect(foo).toBeLessThan(dot)
    })

    it('does not duplicate args', () => {
      const args = builder.testCompileArgs('-c -i')
      expect(args.filter(x => x === '-c').length).toEqual(1)
      expect(args.filter(x => x === '-i').length).toEqual(1)
    })

    it('does not allow overriding the output file', () => {
      const args = builder.testCompileArgs('-o /root/dont_write_here')
      const i = args.indexOf('-o')
      expect(i).not.toEqual(-1)
      expect(args[i+1]).not.toEqual('/root/dont_write_here')
    })
  })

  describe('build command', () => {
    it('runs go build for code outside gopath', () => {
      [{
        gopath: 'C:\\Users\\jsmith\\go',
        cwd: 'C:\\projects\\go\\test',
        sep: '\\'
      }, {
        gopath: '/home/jsmith/go',
        cwd: '/home/jsmith/go',
        sep: '/'
      }, {
        gopath: '/home/jsmith/go',
        cwd: '/home/jsmith/code/',
        sep: '/'
      }, {
        gopath: '/Users/jsmith/go',
        cwd: '/Users/jsmith/documents',
        sep: '/'
      }].forEach(({gopath, cwd, sep}) => {
        expect(builder.buildCommand(gopath, cwd, sep)).toBe('build', cwd)
      })
    })

    it('runs go install for code in gopath', () => {
      [{
        gopath: 'C:\\Users\\jsmith\\go',
        cwd: 'C:\\Users\\jsmith\\go\\src\\github.com\\foo',
        sep: '\\'
      }, {
        gopath: '/home/jsmith/go',
        cwd: '/home/jsmith/go/src/bar',
        sep: '/'
      }, {
        gopath: '/Users/jsmith/go',
        cwd: '/Users/jsmith/go/src/github.com/foo/bar',
        sep: '/'
      }, {
        gopath: '/Users/jsmith/go/',
        cwd: '/Users/jsmith/go/src/github.com/foo/bar',
        sep: '/'
      }].forEach(({gopath, cwd, sep}) => {
        expect(builder.buildCommand(gopath, cwd, sep)).toBe('install', cwd)
      })
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
      expect(message.excerpt.indexOf('syntax error: unexpected semicolon or newline, expecting comma or }') === 0).toBeTruthy()
      expect(message.location.file.indexOf('the-file.go') > 0).toBeTruthy() // file is in the path
      expect(message.location.file.indexOf('sample-project') > 0).toBeTruthy() // cwd is in the path
      expect(message.location.position.start.row).toEqual(11)
    })
  })
})
