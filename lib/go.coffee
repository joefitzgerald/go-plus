fs = require 'fs-plus'
path = require 'path'
os = require 'os'
_ = require 'underscore-plus'

module.exports =
class Go
  name: '' # Name of this go
  os: '' # go env's GOOS
  exe: ''
  arch: '' # go env's GOARCH
  version: '' # The result of 'go version'
  gopath: '' # go env's GOPATH
  goroot: '' # go env's GOROOT
  gotooldir: '' # go env's GOTOOLDIR
  env: false # Copy of the environment

  constructor: (@executable, @pathexpander, options) ->
    @name = options.name if options?.name?
    @os = options.os if options?.os?
    @exe = options.exe if options?.exe?
    @arch = options.arch if options?.arch?
    @version = options.version if options?.version?
    @gopath = options.gopath if options?.gopath?
    @goroot = options.goroot if options?.goroot?
    @gotooldir = options.gotooldir if options?.gotooldir?

  description: ->
    return @name + ' (@ ' + @goroot + ')'

  go: ->
    return false unless @executable? and @executable isnt ''
    return false unless fs.existsSync(@executable)
    return fs.realpathSync(@executable)

  buildgopath: ->
    result = ''
    gopathConfig = atom.config.get('go-plus.goPath')
    environmentOverridesConfig = atom.config.get('go-plus.environmentOverridesConfiguration')? and atom.config.get('go-plus.environmentOverridesConfiguration')
    result = @env.GOPATH if @env.GOPATH? and @env.GOPATH isnt ''
    result = @gopath if @gopath? and @gopath isnt ''
    result = gopathConfig if not environmentOverridesConfig and gopathConfig? and gopathConfig.trim() isnt ''
    result = gopathConfig if result is '' and gopathConfig? and gopathConfig.trim() isnt ''
    return @pathexpander.expand(result, '')

  splitgopath: ->
    result = @buildgopath()
    return [] unless result? and result isnt ''
    return result.split(path.delimiter)

  gofmt: ->
    return false unless @goroot? and @goroot isnt ''
    result = path.join(@goroot, 'bin', 'gofmt' + @exe)
    return false unless fs.existsSync(result)
    return fs.realpathSync(result)

  format: ->
    if atom.config.get('go-plus.formatWithGoImports')? and atom.config.get('go-plus.formatWithGoImports') then @goimports() else @gofmt()

  godoc: ->
    return false unless @goroot? and @goroot isnt ''
    result = path.join(@goroot, 'bin', 'godoc' + @exe)
    return false unless fs.existsSync(result)
    return fs.realpathSync(result)

  vet: ->
    return false unless @gotooldir? and @gotooldir isnt ''
    result = path.join(@gotooldir, 'vet' + @exe)
    return false unless fs.existsSync(result)
    return fs.realpathSync(result)

  cover: ->
    return false unless @gotooldir? and @gotooldir isnt ''
    result = path.join(@gotooldir, 'cover' + @exe)
    return false unless fs.existsSync(result)
    return fs.realpathSync(result)

  goimports: ->
    return @gopathOrPathBinItem('goimports')

  golint: ->
    return @gopathOrPathBinItem('golint')

  oracle: ->
    return @gopathOrPathBinItem('oracle')

  gopathOrPathBinItem: (name) ->
    pathresult = false

    gopaths = @splitgopath()
    for item in gopaths
      result = path.resolve(path.normalize(path.join(item, 'bin', name + @exe)))
      return fs.realpathSync(result) if fs.existsSync(result)

    # PATH
    p = if os.platform() is 'win32' then @env.Path else @env.PATH
    if p?
      elements = p.split(path.delimiter)
      for element in elements
        target = path.resolve(path.normalize(path.join(element, name + @exe)))
        pathresult = fs.realpathSync(target) if fs.existsSync(target)

    return pathresult

  toolsAreMissing: ->
    return true if @format() is false
    return true if @golint() is false
    return true if @vet() is false
    return true if @cover() is false
    return true if @oracle() is false
    return false
