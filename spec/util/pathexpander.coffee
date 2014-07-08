_ = require 'underscore-plus'
path = require 'path'
PathExpander = require './../../lib/util/pathexpander'

describe "pathexpander", ->
  [pathexpander, gopath] = []

  beforeEach ->
    pathexpander = new PathExpander()

  describe "when working with a single-item path", ->
    it "joins the command with the path", ->
      runs =>
        path = path.join('~', 'go', 'bin')
        result = pathexpander.joinCommandWithPath(path, 'goimports')
        expect(result).toBeDefined
        expect(result).toBeTruthy
        expect(_.size(result)).toBe 1
        expect(result[0]).toBeDefined
        expect(result[0]).toBe path.join(process.env.HOME, 'go', 'bin', 'goimports')

    it "expands the path", ->
      runs =>
        result = pathexpander.expand(path.join('~', 'go', 'go', '..', 'bin', 'goimports'), '~/go')
        expect(result).toBeDefined
        expect(result).toBeTruthy
        expect(result).toBe path.join(env.HOME, 'go', 'bin', 'goimports')

        result = pathexpander.expand(path.join('$GOPATH', 'go', '..', 'bin', 'goimports'), '~/go')
        expect(result).toBeDefined
        expect(result).toBeTruthy
        expect(result).toBe path.join(process.env.HOME, 'go', 'bin', 'goimports')

  describe "when working with a multi-item path", ->
    it "joins the command with the path", ->
      runs =>
        path = path.join('~', 'go', 'bin') + path.delimiter + path.join('~', 'othergo', 'bin')
        result = pathexpander.joinCommandWithPath(path, 'goimports')
        expect(result).toBeDefined
        expect(result).toBeTruthy
        expect(_.size(result)).toBe 2
        expect(result[0]).toBeDefined
        expect(result[0]).toBe path.join(process.env.HOME, 'go', 'bin', 'goimports')
        expect(result[1]).toBeDefined
        expect(result[1]).toBe path.join(process.env.HOME, 'othergogo', 'bin', 'goimports')

        result = pathexpander.joinCommandWithPath(path, 'goimports', true)
        expect(result).toBeDefined
        expect(result).toBeTruthy
        expect(_.size(result)).toBe 1
        expect(result[0]).toBeDefined
        expect(result[0]).toBe path.join(process.env.HOME, 'go', 'bin', 'goimports')

    it "expands the path", ->
      runs =>
        result = pathexpander.expand(path.join('~', 'go', 'go', '..', 'bin', 'goimports'), '~/go:~/othergo')
        expect(result).toBeDefined
        expect(result).toBeTruthy
        expect(result).toBe path.join(process.env.HOME, 'go', 'bin', 'goimports')

        result = pathexpander.expand(path.join('$GOPATH', 'go', '..', 'bin', 'goimports'), '~/go:~/othergo')
        expect(result).toBeDefined
        expect(result).toBeTruthy
        expect(result).toBe path.join(process.env.HOME, 'go', 'bin', 'goimports')
