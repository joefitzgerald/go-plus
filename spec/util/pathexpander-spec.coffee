_ = require('underscore-plus')
path = require('path')
PathExpander = require('./../../lib/util/pathexpander')
PathHelper = require('./pathhelper.coffee')
Environment = require('./../../lib/environment')

describe 'pathexpander', ->
  [environment, pathexpander, pathhelper, gopath] = []

  beforeEach ->
    environment = new Environment(process.env)
    pathexpander = new PathExpander(environment.Clone())
    pathhelper = new PathHelper()

  describe 'when working with a single-item path', ->

    it 'expands the path', ->
      runs ->
        result = pathexpander.expand(path.join('~', 'go', 'go', '..', 'bin', 'goimports'), '~/go')
        expect(result).toBeDefined()
        expect(result).toBeTruthy()
        expect(result).toBe(path.join(pathhelper.home(), 'go', 'bin', 'goimports'))

        result = pathexpander.expand(path.join('$GOPATH', 'go', '..', 'bin', 'goimports'), '~/go')
        expect(result).toBeDefined()
        expect(result).toBeTruthy()
        expect(result).toBe(path.join(pathhelper.home(), 'go', 'bin', 'goimports'))

  describe 'when working with a multi-item path', ->
    it 'expands the path', ->
      runs ->
        result = pathexpander.expand(path.join('~', 'go', 'go', '..', 'bin', 'goimports'), '~/go' + path.delimiter + '~/othergo')
        expect(result).toBeDefined()
        expect(result).toBeTruthy()
        expect(result).toBe(path.join(pathhelper.home(), 'go', 'bin', 'goimports'))

        result = pathexpander.expand(path.join('$GOPATH', 'go', '..', 'bin', 'goimports'), '~/go' + path.delimiter + '~/othergo')
        expect(result).toBeDefined()
        expect(result).toBeTruthy()
        expect(result).toBe(path.join(pathhelper.home(), 'go', 'bin', 'goimports'))
