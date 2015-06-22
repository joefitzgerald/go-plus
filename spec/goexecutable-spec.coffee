path = require('path')
fs = require('fs-plus')
os = require('os')
temp = require('temp').track()
_ = require('underscore-plus')
GoExecutable = require('./../lib/goexecutable')
Environment = require('./../lib/environment')
AtomConfig = require('./util/atomconfig')

describe 'go executable', ->
  [environment, goexecutable, directory, env, go] = []

  beforeEach ->
    runs ->
      atomconfig = new AtomConfig()
      atomconfig.defaults()
      environment = new Environment(process.env)
      directory = temp.mkdirSync()
      env = environment.Clone()
      env['GOPATH'] = directory

  describe 'when there is a symlink to a directory called go in a directory in the path', ->
    [pathDirectory] = []

    beforeEach ->
      runs ->
        pathDirectory = temp.mkdirSync()
        fs.mkdirSync(path.join(pathDirectory, 'bin'))
        fs.mkdirSync(path.join(pathDirectory, 'otherbin'))
        fs.mkdirSync(path.join(pathDirectory, 'otherbin', 'go'))
        fs.mkdirSync(path.join(pathDirectory, 'go'))
        fs.symlinkSync(path.join(pathDirectory, 'go'), path.join(pathDirectory, 'bin', 'go'))
        env['PATH'] = env['PATH'] + path.delimiter + path.join(pathDirectory, 'bin') + path.delimiter + path.join(pathDirectory, 'otherbin')
        goexecutable = new GoExecutable(env)

      waitsForPromise -> goexecutable.detect().then (gos) ->
        go = goexecutable.current()

    it 'chooses the correct go', ->
      expect(goexecutable).toBeDefined()
      expect(go).toBeDefined()
      expect(go).toBeTruthy()

  describe 'when the GOPATH is empty', ->
    beforeEach ->
      runs ->
        env['GOPATH'] = ''
        atom.config.set('go-plus.goPath', '')
        goexecutable = new GoExecutable(env)

      waitsForPromise -> goexecutable.detect().then (gos) ->
        go = goexecutable.current()

    it 'finds tools if they are on the PATH but not in the GOPATH', ->
      done = false
      expect(goexecutable).toBeDefined()
      expect(go).toBeDefined()
      expect(go).toBeTruthy()
      expect(go.gopath).toBe('')
      expect(go.goimports()).not.toBe(false)
      expect(go.golint()).not.toBe(false)

  describe 'when the GOPATH and PATH are empty', ->
    beforeEach ->
      runs ->
        env['GOPATH'] = ''
        atom.config.set('go-plus.goPath', '')
        if os.platform() is 'win32'
          env['Path'] = ''
        else
          env['PATH'] = ''
        goexecutable = new GoExecutable(env)

      waitsForPromise -> goexecutable.detect().then (gos) ->
        go = goexecutable.current()

    it 'skips fetching tools if GOPATH is empty', ->
      done = false
      expect(goexecutable).toBeDefined()
      expect(go).toBeDefined()
      expect(go).toBeTruthy()
      expect(go.gopath).toBe('')
      expect(go.goimports()).toBe(false)
      expect(go.golint()).toBe(false)
      goexecutable.once 'gettools-complete', ->
        go = goexecutable.current()
        expect(go).toBeDefined()
        expect(go).toBeTruthy()
        expect(go.gopath).toBe('')
        expect(go.goimports()).toBe(false)
        expect(go.golint()).toBe(false)
        done = true
      goexecutable.gettools(go, true)

      waitsFor ->
        done is true

  describe 'when user has the go executable in their path', ->
    beforeEach ->
      runs ->
        goexecutable = new GoExecutable(env)

      waitsForPromise -> goexecutable.detect().then (gos) ->
        go = goexecutable.current()

    it 'determines the current go version', ->
      runs ->
        expect(goexecutable).toBeDefined()
        expect(go).toBeDefined()
        expect(go).toBeTruthy()
        expect(go.name.substring(0, 2)).toBe('go') unless go.version is 'devel'
        expect(go.version.substring(0, 2)).toBe('go') unless go.version is 'devel'
        expect(go.arch).toBe('amd64') unless go.version is 'devel'
        if os.platform() is 'win32'
          expect(go.executable.substring(go.executable.length - 6, go.executable.length)).toBe('go.exe')
        else
          expect(go.executable.substring(go.executable.length - 2, go.executable.length)).toBe('go')

    xit 'fetches missing tools if requested', -> # integration test
      done = false
      runs ->
        suffix = if os.platform() is 'win32' then '.exe' else ''
        expect(goexecutable).toBeDefined()
        expect(go).toBeDefined()
        expect(go).toBeTruthy()
        expect(go.gopath).toBe(directory)
        expect(go.goimports()).toBe(false)
        expect(go.goreturns()).toBe(false)
        expect(go.golint()).toBe(false)
        expect(go.oracle()).toBe(false)
        goexecutable.once 'gettools-complete', ->
          go = goexecutable.current()
          expect(go).toBeDefined()
          expect(go).toBeTruthy()
          expect(go.gopath).toBe(directory)
          expect(go.goimports()).toBe(fs.realpathSync(path.join(directory, 'bin', 'goimports' + suffix)))
          expect(go.goreturns()).toBe(false)
          expect(go.golint()).toBe(fs.realpathSync(path.join(directory, 'bin', 'golint' + suffix)))
          expect(go.oracle()).toBe(path.join(directory, 'bin', 'oracle' + suffix))
          done = true
        goexecutable.gettools(go, true)

      waitsFor ->
        done is true
      , 60000 # Go getting takes a while (this will fail without internet)

      runs ->
        suffix = if os.platform() is 'win32' then '.exe' else ''
        expect(goexecutable).toBeDefined()
        expect(go).toBeDefined()
        expect(go).toBeTruthy()
        expect(go.gopath).toBe(directory)
        expect(go.goimports()).not.toBe(false)
        expect(go.goreturns()).toBe(false)
        expect(go.golint()).not.toBe(false)
        expect(go.oracle()).toBe(false)
        goexecutable.once 'gettools-complete', ->
          go = goexecutable.current()
          expect(go).toBeDefined()
          expect(go).toBeTruthy()
          expect(go.gopath).toBe(directory)
          expect(go.goimports()).toBe(fs.realpathSync(path.join(directory, 'bin', 'goimports' + suffix)))
          expect(go.goreturns()).toBe(fs.realpathSync(path.join(directory, 'bin', 'goreturns' + suffix)))
          expect(go.golint()).toBe(fs.realpathSync(path.join(directory, 'bin', 'golint' + suffix)))
          expect(go.oracle()).toBe(path.join(directory, 'bin', 'oracle' + suffix))
          done = true
        goexecutable.gettools(go, true)

      waitsFor ->
        done is true
      , 60000 # Go getting takes a while (this will fail without internet)
