async = require 'async'
path = require 'path'
fs = require 'fs-plus'
os = require 'os'
Go = require './go'
_ = require 'underscore-plus'
{exec} = require 'child_process'
{Subscriber, Emitter} = require 'emissary'

module.exports =
class GoExecutable
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: ->
    @gos = []
    @currentgo = ''

  destroy: ->
    @unsubscribe()
    @reset()

  reset: ->
    @gos = []
    @currentgo = ''
    @emit 'reset'

  detect: =>
    executables = []
    target = this
    switch os.platform()
      when 'darwin', 'freebsd', 'linux', 'sunos'
        # Binary Distribution
        executables.push path.normalize(path.join('/usr', 'local', 'go', 'bin', 'go'))
        # Homebrew
        executables.push path.normalize(path.join('/usr', 'local', 'bin', 'go', ))
      when 'win32'
        executables.push path.normalize(path.join('C:','go', 'bin', 'go'))

    # De-duplicate entries
    executables = _.uniq(executables)
    async.filter executables, fs.exists, (results) ->
      executables = results
    async.map executables, @introspect, (err, results) =>
      console.log 'Error mapping go:' + err if err?
      @gos = results
      @emit('detect-complete', @current())

  introspect: (executable, outercallback) =>
    absoluteExecutable = path.resolve(executable)

    go = new Go(absoluteExecutable)
    async.series([
      (callback) ->
        cmd = absoluteExecutable + ' version'
        exec cmd, (err, stdout, stderr) =>
          unless stderr? and stderr isnt ''
            if stdout? and stdout isnt ''
              components = stdout.split(' ')
              go.name = components[2] + ' ' + components[3]
              go.version = components[2]
          callback(err)
      (callback) ->
        cmd = absoluteExecutable + ' env'
        exec cmd, (err, stdout, stderr) =>
          unless stderr? and stderr isnt ''
            if stdout? and stdout isnt ''
              items = stdout.split("\n")
              for item in items
                if item? and item isnt '' and item.trim() isnt ''
                  tuple = item.split('=')
                  key = tuple[0]
                  value = ''
                  value = tuple[1].substring(1, tuple[1].length - 1) if tuple[1].length > 2
                  switch key
                    when 'GOARCH' then go.arch = value
                    when 'GOOS' then go.os = value
                    when 'GOPATH' then go.gopath = value
                    when 'GOROOT' then go.goroot = value
                    when 'GOTOOLDIR' then go.gotooldir = value
          callback(err)
    ], (err, results) =>
      outercallback(err, go)
    )

  current: =>
    return @gos[0] if _.size(@gos) is 1
    for go in @gos
      return go if go.name is @currentgo

    return @gos[0]
