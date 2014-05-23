path = require 'path'
fs = require 'fs-plus'
temp = require('temp').track()
{WorkspaceView} = require 'atom'
_ = require 'underscore-plus'
GoExecutable = require './../lib/goexecutable'

describe "go executable", ->
  [goexecutable] = []

  beforeEach ->
    goexecutable = new GoExecutable(process.env)

  describe "when user has the go executable in their path", ->
    beforeEach ->

    it "determines the current go version", ->
      done = false
      go = false

      runs ->
        goexecutable.once 'detect-complete', (thego) ->
          go = thego
          done = true
        goexecutable.detect()

      waitsFor ->
        done is true

      runs =>
        expect(goexecutable).toBeDefined
        expect(go).toBeDefined
        expect(go).toBeTruthy
        expect(go.name.substring(0,2)).toBe 'go'
        expect(go.version.substring(0,2)).toBe 'go'
        expect(go.arch).toBe 'amd64'
        expect(go.executable.substring(go.executable.length - 2, go.executable.length)).toBe 'go'
