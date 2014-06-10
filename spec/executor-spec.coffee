path = require 'path'
Executor = require './../lib/executor'

describe "executor", ->
  [executor] = []

  beforeEach ->
    executor = new Executor()

  describe "when executing a command", ->

    it "succeeds", ->
      complete = false
      runs =>
        done = (exitcode, stdout, stderr) =>
          expect(exitcode).toBeDefined
          expect(exitcode).toBe 0
          expect(stdout).toBeUndefined
          expect(stderr).toBeUndefined
          complete = true
        result = executor.exec('cd', null, null, done, [process.env.HOME]) # TODO: ensure this works on Windows

      waitsFor =>
        complete is true

    it "sets the working directory correctly", ->
      complete = false
      runs =>
        done = (exitcode, stdout, stderr) =>
          expect(exitcode).toBeDefined
          expect(exitcode).toBe 0
          expect(stdout).toBeDefined
          expect(stdout).toBe process.env.HOME + '\n' # TODO: ensure this works on Windows
          expect(stderr).toBeUndefined
          complete = true
        result = executor.exec('pwd', process.env.HOME, null, done, null)

      waitsFor =>
        complete is true

    it "sets the environment correctly", ->
      complete = false
      runs =>
        done = (exitcode, stdout, stderr) =>
          expect(exitcode).toBeDefined
          expect(exitcode).toBe 0
          expect(stdout).toBeDefined
          expect(stdout).toBe 'testenv=testing\n' # TODO: ensure this works on Windows
          expect(stderr).toBeUndefined
          complete = true
        env =
          testenv: 'testing'

        result = executor.exec('env', null, env, done, null)

      waitsFor =>
        complete is true
