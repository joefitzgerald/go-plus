fs = require('fs-plus')
path = require('path')
os = require('os')
_ = require('underscore-plus')

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
    result = result.replace('\n', '').replace('\r', '')
    return @pathexpander.expand(result, '')

  splitgopath: ->
    result = @buildgopath()
    return [] unless result? and result isnt ''
    return result.split(path.delimiter)

  gofmt: ->
    return @gorootBinOrPathItem('gofmt')

  format: ->
    switch atom.config.get('go-plus.formatTool')
      when 'goimports' then return @goimports()
      when 'goreturns' then return @goreturns()
      else return @gofmt()

  # godoc: ->
  #   return false unless @goroot? and @goroot isnt ''
  #   result = path.join(@goroot, 'bin', 'godoc' + @exe)
  #   return false unless fs.existsSync(result)
  #   return fs.realpathSync(result)

  vet: ->
    return @goTooldirOrGopathBinOrPathItem('vet')

  cover: ->
    return @goTooldirOrGopathBinOrPathItem('cover')

  goimports: ->
    return @gopathBinOrPathItem('goimports')

  goreturns: ->
    return @gopathBinOrPathItem('goreturns')

  golint: ->
    return @gopathBinOrPathItem('golint')

  gocode: ->
    return @gopathBinOrPathItem('gocode')

  godef: ->
    return @goTooldirOrGopathBinOrPathItem('godef')

  oracle: ->
    return @gopathBinOrPathItem('oracle')

  git: ->
    return @pathItem('git')

  goTooldirOrGopathBinOrPathItem: (name) ->
    result = @goTooldirItem(name)
    result = @gopathBinOrPathItem(name) unless result? and result
    return result

  gopathBinOrPathItem: (name) ->
    result = @gopathBinItem(name)
    result = @pathItem(name) unless result? and result
    return result

  gopathBinItem: (name) ->
    return false unless name? and name isnt ''
    gopaths = @splitgopath()
    for item in gopaths
      result = path.resolve(path.normalize(path.join(item, 'bin', name + @exe)))
      return fs.realpathSync(result) if fs.existsSync(result)
    return false

  pathItem: (name) ->
    return false unless name? and name isnt ''
    pathresult = false
    # PATH
    p = if os.platform() is 'win32' then @env.Path else @env.PATH
    if p?
      elements = p.split(path.delimiter)
      for element in elements
        target = path.resolve(path.normalize(path.join(element, name + @exe)))
        pathresult = fs.realpathSync(target) if fs.existsSync(target)

    return pathresult

  gorootBinOrPathItem: (name) ->
    return false unless name? and name isnt ''
    result = @gorootBinItem(name)
    result = @pathItem(name) unless result? and result
    return result

  gorootBinItem: (name) ->
    return false unless name? and name isnt ''
    return false unless @goroot? and @goroot isnt ''
    result = path.join(@goroot, 'bin', name + @exe)
    return false unless fs.existsSync(result)
    return fs.realpathSync(result)

  goTooldirItem: (name) ->
    return false unless name? and name isnt ''
    result = path.join(@gotooldir, name + @exe)
    return fs.realpathSync(result) if fs.existsSync(result)
    return false

  toolsAreMissing: ->
    return true if @format() is false
    return true if @golint() is false
    return true if @vet() is false
    return true if @cover() is false
    return true if @gocode() is false
    return true if @oracle() is false
    return true if @git() is false
    return true if @godef() is false
    return false
