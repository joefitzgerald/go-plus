async = require 'async'
path = require 'path'
fs = require 'fs-plus'
os = require 'os'
Go = require './go'
_ = require 'underscore-plus'
Executor = require './executor'
PathExpander = require './util/pathexpander'
{Subscriber, Emitter} = require 'emissary'

module.exports =
class GoExecutable
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (@env) ->
    @gos = []
    @currentgo = ''
    @executor = new Executor(@env)
    @pathexpander = new PathExpander(@env)

  destroy: ->
    @unsubscribe()
    @executor = null
    @pathexpander = null
    @gos = []
    @currentgo = ''
    @reset()

  reset: ->
    @gos = []
    @currentgo = ''
    @emit 'reset'

  detect: =>
    executables = []
    goinstallation = atom.config.get('go-plus.goInstallation')
    switch os.platform()
      when 'darwin', 'freebsd', 'linux', 'sunos'
        # Configuration
        if goinstallation? and goinstallation.trim() isnt ''
          if goinstallation.lastIndexOf(path.sep + 'go') is goinstallation.length - 3 or goinstallation.lastIndexOf(path.sep + 'goapp') is goinstallation.length - 6
            executables.push path.normalize(goinstallation)

        # PATH
        if @env.PATH?
          elements = @env.PATH.split(path.delimiter)
          for element in elements
            executables.push path.normalize(path.join(element, 'go'))

        # Binary Distribution
        executables.push path.normalize(path.join('/usr', 'local', 'go', 'bin', 'go'))
        # Homebrew
        executables.push path.normalize(path.join('/usr', 'local', 'bin', 'go', ))
      when 'win32'
        # Configuration
        if goinstallation? and goinstallation.trim() isnt ''
          if goinstallation.lastIndexOf(path.sep + 'go.exe') is goinstallation.length - 7 or goinstallation.lastIndexOf(path.sep + 'goapp.bat') is goinstallation.length - 10
            executables.push path.normalize(goinstallation)

        # PATH
        if @env.Path?
          elements = @env.Path.split(path.delimiter)
          for element in elements
            executables.push path.normalize(path.join(element, 'go.exe'))

        # Binary Distribution
        executables.push path.normalize(path.join('C:','go', 'bin', 'go.exe'))

    # De-duplicate entries
    executables = _.uniq(executables)
    async.filter executables, fs.exists, (results) =>
      executables = results
      async.map executables, @introspect, (err, results) =>
        console.log 'Error mapping go: ' + err if err?
        @gos = results
        @emit('detect-complete', @current())

  introspect: (executable, outercallback) =>
    absoluteExecutable = path.resolve(executable)

    go = new Go(absoluteExecutable, @pathexpander)
    async.series([
      (callback) =>
        done = (exitcode, stdout, stderr) =>
          unless stderr? and stderr isnt ''
            if stdout? and stdout isnt ''
              components = stdout.replace(/\r?\n|\r/g, '').split(' ')
              go.name = components[2] + ' ' + components[3]
              go.version = components[2]
              go.env = @env
          console.log 'Error running go version: ' + err if err?
          console.log 'Error detail: ' + stderr if stderr? and stderr isnt ''
          callback(null)
        try
          @executor.exec(absoluteExecutable, false, @env, done, ['version'])
        catch error
          console.log 'go [' + absoluteExecutable + '] is not a valid go'
          go = null
      (callback) =>
        done = (exitcode, stdout, stderr) =>
          unless stderr? and stderr isnt ''
            if stdout? and stdout isnt ''
              items = stdout.split("\n")
              for item in items
                if item? and item isnt '' and item.trim() isnt ''
                  tuple = item.split('=')
                  key = tuple[0]
                  value = ''
                  if os.platform() is 'win32'
                    value = tuple[1]
                  else
                    value = tuple[1].substring(1, tuple[1].length - 1) if tuple[1].length > 2
                  if os.platform() is 'win32'
                    switch key
                      when 'set GOARCH' then go.arch = value
                      when 'set GOOS' then go.os = value
                      when 'set GOPATH' then go.gopath = value
                      when 'set GOROOT' then go.goroot = value
                      when 'set GOTOOLDIR' then go.gotooldir = value
                      when 'set GOEXE' then go.exe = value
                  else
                    switch key
                      when 'GOARCH' then go.arch = value
                      when 'GOOS' then go.os = value
                      when 'GOPATH' then go.gopath = value
                      when 'GOROOT' then go.goroot = value
                      when 'GOTOOLDIR' then go.gotooldir = value
                      when 'GOEXE' then go.exe = value
          console.log 'Error running go env: ' + err if err?
          console.log 'Error detail: ' + stderr if stderr? and stderr isnt ''
          callback(null)
        try
          @executor.exec(absoluteExecutable, false, @env, done, ['env']) unless go is null
        catch error
          console.log 'go [' + absoluteExecutable + '] is not a valid go'
    ], (err, results) =>
      outercallback(err, go)
    )

  gettools: (go, updateExistingTools) =>
    unless go?
      @emit 'gettools-complete'
      return
    gogetenv = _.clone(@env)
    gopath = go.buildgopath()
    unless gopath? and gopath.trim() isnt ''
      @emit 'gettools-complete'
      return
    gogetenv['GOPATH'] = gopath
    async.series([
      (callback) =>
        done = (exitcode, stdout, stderr) =>
          callback(null)
        if go.godoc() isnt false and not updateExistingTools
          done()
        else
          @executor.exec(go.executable, false, gogetenv, done, ['get', '-u', 'code.google.com/p/go.tools/cmd/godoc'])
      (callback) =>
        done = (exitcode, stdout, stderr) =>
          callback(null)
        if go.vet() isnt false and not updateExistingTools
          done()
        else
          @executor.exec(go.executable, false, gogetenv, done, ['get', '-u', 'code.google.com/p/go.tools/cmd/vet'])
      (callback) =>
        done = (exitcode, stdout, stderr) =>
          callback(null)
        if go.cover() isnt false and not updateExistingTools
          done()
        else
          @executor.exec(go.executable, false, gogetenv, done, ['get', '-u', 'code.google.com/p/go.tools/cmd/cover'])
      (callback) =>
        done = (exitcode, stdout, stderr) =>
          callback(null)
        if go.goimports() isnt false and not updateExistingTools
          done()
        else
          @executor.exec(go.executable, false, gogetenv, done, ['get', '-u', 'code.google.com/p/go.tools/cmd/goimports'])
      (callback) =>
        done = (exitcode, stdout, stderr) =>
          callback(null)
        if go.golint() isnt false and not updateExistingTools
          done()
        else
          @executor.exec(go.executable, false, gogetenv, done, ['get', '-u', 'github.com/golang/lint/golint'])
      (callback) =>
        done = (exitcode, stdout, stderr) =>
          callback(null)
        if go.oracle() isnt false and not updateExistingTools
          done()
        else
          @executor.exec(go.executable, false, gogetenv, done, ['get', '-u', 'code.google.com/p/go.tools/cmd/oracle'])
    ], (err, results) =>
      @emit 'gettools-complete'
    )

  current: =>
    return @gos[0] if _.size(@gos) is 1
    for go in @gos
      return go if go.executable is @currentgo
    return @gos[0]
