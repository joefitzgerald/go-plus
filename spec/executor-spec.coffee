_ = require('underscore-plus')
path = require('path')
os = require('os')
Environment = require('./../lib/environment')
Executor = require('./../lib/executor')
PathHelper = require('./util/pathhelper')

describe 'executor', ->
  [environment, executor, pathhelper, prefix] = []

  beforeEach ->
    environment = new Environment(process.env)
    executor = new Executor(environment.Clone())
    pathhelper = new PathHelper()
    prefix = if os.platform() is 'win32' then 'C:\\' else '/'

  describe 'when asynchronously executing a command', ->

    it 'succeeds', ->
      complete = false
      runs ->
        command = if os.platform() is 'win32' then path.resolve(__dirname, 'tools', 'env', 'env_windows_amd64.exe') else 'env'
        done = (exitcode, stdout, stderr, messages) ->
          expect(exitcode).toBeDefined()
          expect(exitcode).toBe(0)
          expect(stdout).toBeDefined()
          expect(stdout).not.toBe('')
          expect(stderr).toBeDefined()
          expect(stderr).toBe('')
          expect(_.size(messages)).toBe(0)
          complete = true
        result = executor.exec(command, prefix, null, done, [])

      waitsFor ->
        complete is true

    it 'sets the working directory correctly', ->
      complete = false
      runs ->
        command = if os.platform() is 'win32' then path.resolve(__dirname, 'tools', 'pwd', 'pwd_windows_amd64.exe') else 'pwd'
        done = (exitcode, stdout, stderr, messages) ->
          expect(exitcode).toBeDefined()
          expect(exitcode).toBe(0)
          expect(stdout).toBeDefined()
          expect(stdout).toBe(pathhelper.home() + '\n')
          expect(stderr).toBeDefined()
          expect(stderr).toBe('')
          expect(_.size(messages)).toBe(0)
          complete = true
        result = executor.exec(command, pathhelper.home(), null, done, null)

      waitsFor ->
        complete is true

    it 'sets the environment correctly', ->
      complete = false
      runs ->
        command = if os.platform() is 'win32' then path.resolve(__dirname, 'tools', 'env', 'env_windows_amd64.exe') else 'env'
        done = (exitcode, stdout, stderr, messages) ->
          expect(exitcode).toBeDefined()
          expect(exitcode).toBe(0)
          expect(stdout).toBeDefined()
          expect(stdout).toContain('testenv=testing\n') # TODO: ensure this works on Windows
          expect(stderr).toBeDefined()
          expect(stderr).toBe('')
          expect(_.size(messages)).toBe(0)
          complete = true
        env =
          testenv: 'testing'

        result = executor.exec(command, null, env, done, null)

      waitsFor ->
        complete is true

    it 'returns a message if the command was not found', ->
      complete = false
      runs ->
        done = (exitcode, stdout, stderr, messages) ->
          expect(exitcode).toBeDefined()
          expect(exitcode).not.toBe(0)
          expect(exitcode).toBe(127)
          expect(_.size(messages)).toBe(1)
          expect(messages[0]).toBeDefined()
          expect(messages[0]?.msg).toBe('No file or directory: [nonexistentcommand]')
          expect(stdout).toBeDefined()
          expect(stdout).toBe('')
          expect(stderr).toBeDefined()
          complete = true

        result = executor.exec('nonexistentcommand', null, null, done, null)

      waitsFor ->
        complete is true

  describe 'when synchronously executing a command', ->
    it 'succeeds', ->
      command = if os.platform() is 'win32' then path.resolve(__dirname, 'tools', 'env', 'env_windows_amd64.exe') else 'env'
      result = executor.execSync(command)
      expect(result.code).toBeDefined()
      expect(result.code).toBe(0)
      expect(result.stdout).toBeDefined()
      expect(result.stdout).not.toBe('')
      expect(result.stderr).toBeDefined()
      expect(result.stderr).toBe('')

    it 'returns a message if the command was not found', ->
      result = executor.execSync('nonexistentcommand')
      expect(result.code).toBeDefined()
      expect(result.code).toBe(127)
      expect(_.size(result.messages)).toBe(1)
      expect(result.messages[0]).toBeDefined()
      expect(result.messages[0].msg).toBe('No file or directory: [nonexistentcommand]')
      expect(result.stdout).toBeDefined()
      expect(result.stdout).toBe('')
      expect(result.stderr).toBeDefined()
      expect(result.stderr).toBe('')
