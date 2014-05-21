path = require 'path'
fs = require 'fs-plus'
temp = require('temp').track()
{WorkspaceView} = require 'atom'
_ = require 'underscore-plus'
GoExecutable = require './../lib/goexecutable'

describe "go executable", ->
  [goexecutable] = []

  beforeEach ->
    goexecutable = new GoExecutable()

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
        #expect(go).toBe
        expect(go.version).toBe 'go1.2.1'
