async = require('async')
path = require('path')
fs = require('fs-plus')
os = require('os')
Go = require('./go')
_ = require('underscore-plus')
Executor = require('./executor')
PathExpander = require('./util/pathexpander')
{Subscriber, Emitter} = require('emissary')

module.exports =
class GoExecutable
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (env) ->
    @env = env
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
    @emit('reset')

  buildCandidates: =>
    candidates = []
    goinstallation = atom.config.get('go-plus.goInstallation')
    switch os.platform()
      when 'darwin', 'freebsd', 'linux', 'sunos'
        # Configuration
        if goinstallation? and goinstallation.trim() isnt ''
          if fs.existsSync(goinstallation)
            if fs.lstatSync(goinstallation)?.isDirectory()
              candidates.push(path.normalize(path.join(goinstallation, 'bin', 'go')))
            else if goinstallation.lastIndexOf(path.sep + 'go') is goinstallation.length - 3 or goinstallation.lastIndexOf(path.sep + 'goapp') is goinstallation.length - 6
              candidates.push(path.normalize(goinstallation))

        # PATH
        if @env.PATH?
          elements = @env.PATH.split(path.delimiter)
          for element in elements
            candidates.push(path.normalize(path.join(element, 'go')))

        # Binary Distribution
        candidates.push(path.normalize(path.join('/usr', 'local', 'go', 'bin', 'go')))
        # Homebrew
        candidates.push(path.normalize(path.join('/usr', 'local', 'bin', 'go', )))
      when 'win32'
        # Configuration
        if goinstallation? and goinstallation.trim() isnt ''
          if goinstallation.lastIndexOf(path.sep + 'go.exe') is goinstallation.length - 7 or goinstallation.lastIndexOf(path.sep + 'goapp.bat') is goinstallation.length - 10
            candidates.push(path.normalize(goinstallation))

        # PATH
        if @env.Path?
          elements = @env.Path.split(path.delimiter)
          for element in elements
            candidates.push(path.normalize(path.join(element, 'go.exe')))

        # Binary Distribution
        candidates.push(path.normalize(path.join('C:', 'go', 'bin', 'go.exe')))

        # Chocolatey
        candidates.push(path.normalize(path.join('C:', 'tools', 'go', 'bin', 'go.exe')))

    # De-duplicate entries
    candidates = _.chain(candidates).uniq().map((e) -> path.resolve(path.normalize(e))).filter((e) -> fs.existsSync(e)).reject((e) -> fs.lstatSync(e)?.isDirectory()).value()
    return candidates

  detect: =>
    return new Promise((resolve) =>
      @gos = []
      try
        candidates = @buildCandidates()
        for candidate in candidates
          break unless candidate? and candidate.trim() isnt ''

          # Run go version
          versionResult = @executor.execSync(candidate, false, @env, ['version'])

          # Handle invalid go
          break unless versionResult?
          if versionResult.error?
            console.log('Error running go version for go: [' + candidate + '] (probably not a valid go)')
            console.log('Error detail: ' + versionResult.error)
            break
          if versionResult.stderr? and versionResult.stderr isnt ''
            console.log versionResult.stderr
            break

          if versionResult.stdout? and versionResult.stdout isnt ''
            versionComponents = versionResult.stdout.replace(/\r?\n|\r/g, '').split(' ')
            go = new Go(candidate, @pathexpander)
            go?.name = versionComponents[2] + ' ' + versionComponents[3]
            go?.version = versionComponents[2]
            go?.env = @env

          # Run go env
          envResult = @executor.execSync(candidate, false, @env, ['env']) unless go is null

          # Handle invalid go
          break unless envResult?
          if envResult.error?
            console.log('Error running go env for go: [' + candidate + '] (probably not a valid go)')
            console.log('Error detail: ' + envResult.error)
            break
          if envResult.stderr? and envResult.stderr isnt ''
            console.log envResult.stderr
            break

          if envResult.stdout? and envResult.stdout isnt ''
            items = envResult.stdout.split('\n')
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

          # Crude Validation Of The Go
          if go? and go.executable? and go.gotooldir? and go.gotooldir isnt ''
            @gos.push(go)
      catch error
        console.log error
      resolve(@gos)
    )

  gettools: (go, updateExistingTools) =>
    unless go?
      @emit('gettools-complete')
      return
    gogetenv = _.clone(@env)
    gopath = go.buildgopath()
    unless gopath? and gopath.trim() isnt ''
      @emit('gettools-complete')
      return
    gogetenv['GOPATH'] = gopath
    async.series([
      # (callback) =>
      #   done = (exitcode, stdout, stderr) =>
      #     callback(null)
      #   if go.godoc() isnt false and not updateExistingTools
      #     done()
      #   else
      #     @executor.exec(go.executable, false, gogetenv, done, ['get', '-u', 'golang.org/x/tools/cmd/godoc'])
      (callback) =>
        done = (exitcode, stdout, stderr) ->
          callback(null)
        if go.vet() isnt false and not updateExistingTools
          done()
        else
          @executor.exec(go.executable, false, gogetenv, done, ['get', '-u', 'golang.org/x/tools/cmd/vet'])
      (callback) =>
        done = (exitcode, stdout, stderr) ->
          callback(null)
        if go.cover() isnt false and not updateExistingTools
          done()
        else
          @executor.exec(go.executable, false, gogetenv, done, ['get', '-u', 'golang.org/x/tools/cmd/cover'])
      (callback) =>
        done = (exitcode, stdout, stderr) ->
          callback(null)
        if go.format() isnt false and not updateExistingTools
          done()
        else
          pkg = switch atom.config.get('go-plus.formatTool')
            when 'goimports' then 'golang.org/x/tools/cmd/goimports'
            when 'goreturns' then 'sourcegraph.com/sqs/goreturns'
            else false
          done() unless pkg?
          @executor.exec(go.executable, false, gogetenv, done, ['get', '-u', pkg])
      (callback) =>
        done = (exitcode, stdout, stderr) ->
          callback(null)
        if go.golint() isnt false and not updateExistingTools
          done()
        else
          @executor.exec(go.executable, false, gogetenv, done, ['get', '-u', 'github.com/golang/lint/golint'])
      (callback) =>
        done = (exitcode, stdout, stderr) ->
          callback(null)
        if go.gocode() isnt false and not updateExistingTools
          done()
        else
          @executor.exec(go.executable, false, gogetenv, done, ['get', '-u', 'github.com/nsf/gocode'])
      (callback) =>
        done = (exitcode, stdout, stderr) ->
          callback(null)
        if go.godef() isnt false and not updateExistingTools
          done()
        else
          @executor.exec(go.executable, false, gogetenv, done, ['get', '-u', 'github.com/rogpeppe/godef'])
      (callback) =>
        done = (exitcode, stdout, stderr) ->
          callback(null)
        if go.oracle() isnt false and not updateExistingTools
          done()
        else
          @executor.exec(go.executable, false, gogetenv, done, ['get', '-u', 'golang.org/x/tools/cmd/oracle'])
    ], (err, results) =>
      @emit('gettools-complete')
    )

  current: =>
    return false unless @gos?.length > 0
    return @gos[0] if _.size(@gos) is 1
    for go in @gos
      return go if go?.executable is @currentgo and @currentgo isnt ''
    return @gos[0]
