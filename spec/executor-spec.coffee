_ = require 'underscore-plus'
path = require 'path'
os = require 'os'
Executor = require './../lib/executor'
PathHelper = require './util/pathhelper'

describe "executor", ->
  [executor, pathhelper, prefix] = []

  beforeEach ->
    executor = new Executor()
    pathhelper = new PathHelper()
    prefix = if os.platform() is 'win32' then 'C:\\' else '/'

  describe "when executing a command", ->

    it "succeeds", ->
      complete = false
      runs =>
        command = if os.platform() is 'win32' then path.resolve(__dirname, 'tools', 'env', 'env_windows_amd64.exe') else 'env'
        done = (exitcode, stdout, stderr, messages) =>
          expect(exitcode).toBeDefined
          expect(exitcode).toBe 0
          expect(stdout).toBeDefined
          expect(stdout).not.toBe ''
          expect(stderr).toBeUndefined
          expect(stderr).toBe ''
          expect(_.size(messages)).toBe 0
          complete = true
        result = executor.exec(command, prefix, null, done, [])

      waitsFor =>
        complete is true

    it "sets the working directory correctly", ->
      complete = false
      runs =>
        command = if os.platform() is 'win32' then path.resolve(__dirname, 'tools', 'pwd', 'pwd_windows_amd64.exe') else 'pwd'
        done = (exitcode, stdout, stderr, messages) =>
          expect(exitcode).toBeDefined
          expect(exitcode).toBe 0
          expect(stdout).toBeDefined
          expect(stdout).toBe pathhelper.home() + '\n'
          expect(stderr).toBeUndefined
          expect(_.size(messages)).toBe 0
          complete = true
        result = executor.exec(command, pathhelper.home(), null, done, null)

      waitsFor =>
        complete is true

    it "sets the environment correctly", ->
      complete = false
      runs =>
        command = if os.platform() is 'win32' then path.resolve(__dirname, 'tools', 'env', 'env_windows_amd64.exe') else 'env'
        done = (exitcode, stdout, stderr, messages) =>
          expect(exitcode).toBeDefined
          expect(exitcode).toBe 0
          expect(stdout).toBeDefined
          expect(stdout).toContain 'testenv=testing\n' # TODO: ensure this works on Windows
          expect(stderr).toBeUndefined
          expect(_.size(messages)).toBe 0
          complete = true
        env =
          testenv: 'testing'

        result = executor.exec(command, null, env, done, null)

      waitsFor =>
        complete is true

    it "returns a message if the command was not found", ->
      complete = false
      runs =>
        done = (exitcode, stdout, stderr, messages) =>
          expect(exitcode).toBeDefined
          expect(exitcode).not.toBe 0
          expect(exitcode).toBe 127
          expect(_.size(messages)).toBe 1
          expect(messages[0]).toBeDefined
          expect(messages[0].msg).toBe 'No file or directory: [nonexistentcommand]'
          expect(stdout).toBeUndefined
          expect(stderr).toBeUndefined
          complete = true

        result = executor.exec('nonexistentcommand', null, null, done, null)

      waitsFor =>
        complete is true
