_ = require 'underscore-plus'
path = require 'path'
Go = require './../lib/go'
PathExpander = require './../lib/util/pathexpander'

describe "go", ->
  [go, pathexpander, env] = []

  beforeEach ->
    pathexpander = new PathExpander(process.env)
    go = new Go('/usr/local/bin/go', pathexpander)

  describe "when working with a single-item gopath", ->
    beforeEach ->
      go.gopath = '~/go'

    it "expands the path", ->
      runs =>
        result = go.buildgopath()
        expect(result).toBeDefined
        expect(result).toBeTruthy
        expect(result).toBe path.join(process.env.HOME, 'go')

    it "splits the path", ->
      runs =>
        result = go.splitgopath()
        expect(result).toBeDefined
        expect(result).toBeTruthy
        expect(_.size(result)).toBe 1
        expect(result[0]).toBeDefined
        expect(result[0]).toBe path.join(process.env.HOME, 'go')

  describe "when working with a multi-item gopath", ->
    beforeEach ->
      go.gopath = '~/go:~/go2:/usr/local/go'

    it "expands the path", ->
      runs =>
        result = go.buildgopath()
        expect(result).toBeDefined
        expect(result).toBeTruthy
        expect(result).toBe path.join(process.env.HOME, 'go') + ':' + path.join(process.env.HOME, 'go2') + ':/usr/local/go'

    it "splits the path", ->
      runs =>
        result = go.splitgopath()
        expect(result).toBeDefined
        expect(result).toBeTruthy
        expect(_.size(result)).toBe 3
        expect(result[0]).toBeDefined
        expect(result[0]).toBe path.join(process.env.HOME, 'go')
        expect(result[1]).toBeDefined
        expect(result[1]).toBe path.join(process.env.HOME, 'go2')
        expect(result[2]).toBeDefined
        expect(result[2]).toBe path.join('/usr/local/go')
