_ = require('underscore-plus')
path = require('path')
os = require('os')
Go = require('./../lib/go')
PathExpander = require('./../lib/util/pathexpander')
PathHelper = require('./util/pathhelper')
Environment = require('./../lib/environment')

describe 'go', ->
  [go, environment, pathexpander, pathhelper, env] = []

  beforeEach ->
    environment = new Environment(process.env)
    pathexpander = new PathExpander(environment.Clone())
    pathhelper = new PathHelper()
    go = new Go('/usr/local/bin/go', pathexpander)

  describe 'when working with a single-item gopath', ->
    beforeEach ->
      go.gopath = pathhelper.home() + path.sep + 'go'

    it 'expands the path', ->
      runs ->
        result = go.buildgopath()
        expect(result).toBeDefined()
        expect(result).toBeTruthy()
        expect(result).toBe(path.join(pathhelper.home(), 'go'))

    it 'splits the path', ->
      runs ->
        result = go.splitgopath()
        expect(result).toBeDefined()
        expect(result).toBeTruthy()
        expect(_.size(result)).toBe(1)
        expect(result[0]).toBeDefined()
        expect(result[0]).toBe(path.join(pathhelper.home(), 'go'))

  describe 'when working with a multi-item gopath', ->
    beforeEach ->
      go.gopath = pathhelper.home() + path.sep + 'go' + path.delimiter + pathhelper.home() + path.sep + 'go2' + path.delimiter + path.sep + 'usr' + path.sep + 'local' + path.sep + 'go'

    it 'expands the path', ->
      runs ->
        prefix = if os.platform() is 'win32' then 'c:' else ''
        result = go.buildgopath()
        expect(result).toBeDefined()
        expect(result).toBeTruthy()
        expected = path.join(pathhelper.home(), 'go') + path.delimiter + path.join(pathhelper.home(), 'go2') + path.delimiter + prefix + path.sep + 'usr' + path.sep + 'local' + path.sep + 'go'
        expect(result.toLowerCase()).toBe(expected.toLowerCase())

    it 'splits the path', ->
      runs ->
        prefix = if os.platform() is 'win32' then 'c:' else ''
        result = go.splitgopath()
        expect(result).toBeDefined()
        expect(result).toBeTruthy()
        expect(_.size(result)).toBe(3)
        expect(result[0]).toBeDefined()
        expect(result[0]).toBe(path.join(pathhelper.home(), 'go'))
        expect(result[1]).toBeDefined()
        expect(result[1]).toBe(path.join(pathhelper.home(), 'go2'))
        expect(result[2]).toBeDefined()
        expected = prefix + path.sep + path.join('usr', 'local', 'go')
        expect(result[2].toLowerCase()).toBe(expected.toLowerCase())
