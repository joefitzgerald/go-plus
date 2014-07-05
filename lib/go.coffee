fs = require 'fs-plus'
path = require 'path'
_ = require 'underscore-plus'

module.exports =
class Go
  name: '' # Name of this go
  os: '' # go env's GOOS
  arch: '' # go env's GOARCH
  version: '' # The result of 'go version'
  gopath: '' # go env's GOPATH
  goroot: '' # go env's GOROOT
  gotooldir: '' # go env's GOTOOLDIR
  env: false # Copy of the environment

  constructor: (@executable, @pathexpander, options) ->
    @name = options.name if options?.name?
    @os = options.os if options?.os?
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
    return @executable

  buildgopath: ->
    result = ''
    gopathConfig = atom.config.get('go-plus.goPath')
    environmentOverridesConfig = atom.config.get('go-plus.environmentOverridesConfiguration')
    environmentOverridesConfig ?= true
    result = @gopath if @gopath? and @gopath isnt ''
    result = gopathConfig if not environmentOverridesConfig and gopathConfig? and gopathConfig isnt ''
    result = gopathConfig if @gopath is ''
    return @pathexpander.expand(result, '')

  splitgopath: ->
    result = @buildgopath()
    return [] unless result? and result isnt ''
    return result.split(':')

  gofmt: ->
    return false unless @goroot? and @goroot isnt ''
    result = path.join(@goroot, 'bin', 'gofmt')
    return false unless fs.existsSync(result)
    return result

  godoc: ->
    return false unless @goroot? and @goroot isnt ''
    result = path.join(@goroot, 'bin', 'godoc')
    return false unless fs.existsSync(result)
    return result

  vet: ->
    return false unless @gotooldir? and @gotooldir isnt ''
    result = path.join(@gotooldir, 'vet')
    return false unless fs.existsSync(result)
    return result

  cover: ->
    return false unless @gotooldir? and @gotooldir isnt ''
    result = path.join(@gotooldir, 'cover')
    return false unless fs.existsSync(result)
    return result

  goimports: ->
    return @gopathBinItem('goimports')

  golint: ->
    return @gopathBinItem('golint')

  gopathBinItem: (name) ->
    gopaths = @splitgopath()
    return false unless gopaths? and _.size(gopaths) > 0
    for item in gopaths
      result = path.resolve(path.normalize(path.join(item, 'bin', name)))
      return result if fs.existsSync(result)
    return false
