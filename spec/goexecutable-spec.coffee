path = require 'path'
fs = require 'fs-plus'
os = require 'os'
temp = require('temp').track()
{WorkspaceView} = require 'atom'
_ = require 'underscore-plus'
GoExecutable = require './../lib/goexecutable'
Environment = require './../lib/environment'

describe "go executable", ->
  [environment, goexecutable, directory, env, go] = []

  beforeEach ->
    done = false
    runs ->
      environment = new Environment(process.env)
      directory = temp.mkdirSync()
      env = environment.Clone()
      env['GOPATH'] = directory
      goexecutable = new GoExecutable(env)
      goexecutable.once 'detect-complete', (thego) ->
        go = thego
        done = true
      goexecutable.detect()

    waitsFor ->
      done is true

  describe "when user has the go executable in their path", ->
    it "determines the current go version", ->
      runs =>
        expect(goexecutable).toBeDefined
        expect(go).toBeDefined
        expect(go).toBeTruthy
        expect(go.name.substring(0,2)).toBe 'go'
        expect(go.version.substring(0,2)).toBe 'go'
        expect(go.arch).toBe 'amd64'
        if os.platform() is 'win32'
          expect(go.executable.substring(go.executable.length - 6, go.executable.length)).toBe 'go.exe'
        else
          expect(go.executable.substring(go.executable.length - 2, go.executable.length)).toBe 'go'

    xit "fetches missing tools if requested", -> # integration test
      done = false
      runs =>
        suffix = if os.platform() is 'win32' then '.exe' else ''
        expect(goexecutable).toBeDefined
        expect(go).toBeDefined
        expect(go).toBeTruthy
        expect(go.gopath).toBe directory
        expect(go.goimports()).toBe false
        expect(go.golint()).toBe false
        expect(go.oracle()).toBe false
        goexecutable.once 'gettools-complete', =>
          go = goexecutable.current()
          expect(go).toBeDefined
          expect(go).toBeTruthy
          expect(go.gopath).toBe directory
          expect(go.goimports()).toBe path.join(directory, 'bin', 'goimports' + suffix)
          expect(go.golint()).toBe path.join(directory, 'bin', 'golint' + suffix)
          expect(go.oracle()).toBe path.join(directory, 'bin', 'oracle' + suffix)
          done = true
        goexecutable.gettools(go, true)

      waitsFor =>
        done is true
      , 60000 # Go getting takes a while (this will fail without internet)

    it "finds tools if they are on the PATH but not in the GOPATH", ->
      done = false
      runs ->
        env = environment.Clone()
        env['GOPATH'] = ''
        atom.config.set('go-plus.goPath', '')
        goexecutable = new GoExecutable(env)
        goexecutable.once 'detect-complete', (thego) ->
          go = thego
          done = true
        goexecutable.detect()

      waitsFor ->
        done is true

      runs =>
        done = false
        expect(goexecutable).toBeDefined
        expect(go).toBeDefined
        expect(go).toBeTruthy
        expect(go.gopath).toBe ''
        expect(go.goimports()).not.toBe false
        expect(go.golint()).not.toBe false

    it "skips fetching tools if GOPATH is empty", ->
      done = false
      runs ->
        env = environment.Clone()
        env['GOPATH'] = ''
        if os.platform() is 'win32'
          env['Path'] = ''
        else
          env['PATH'] = ''
        atom.config.set('go-plus.goPath', '')
        goexecutable = new GoExecutable(env)
        goexecutable.once 'detect-complete', (thego) ->
          go = thego
          done = true
        goexecutable.detect()

      waitsFor ->
        done is true

      runs =>
        done = false
        expect(goexecutable).toBeDefined
        expect(go).toBeDefined
        expect(go).toBeTruthy
        expect(go.gopath).toBe ''
        expect(go.goimports()).toBe false
        expect(go.golint()).toBe false
        goexecutable.once 'gettools-complete', =>
          go = goexecutable.current()
          expect(go).toBeDefined
          expect(go).toBeTruthy
          expect(go.gopath).toBe ''
          expect(go.goimports()).toBe false
          expect(go.golint()).toBe false
          done = true
        goexecutable.gettools(go, true)

      waitsFor =>
        done is true
