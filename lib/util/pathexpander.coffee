fs = require 'fs-plus'
path = require 'path'
os = require 'os'

module.exports =
class PathExpander
  constructor: (@env) ->

  expand: (p, gopath) ->
    return '' unless p? and p.trim() isnt ''
    return @expandItem(p, gopath) if p.indexOf(path.delimiter) is -1
    paths = p.split(path.delimiter)
    result = ''
    for pathItem in paths
      pathItem = @expandItem(pathItem, gopath)
      result = if result is '' then pathItem else result + path.delimiter + pathItem
    return result

  expandItem: (p, gopath) ->
    return '' unless p? and p.trim() isnt ''
    p = @replaceGoPathToken(p, gopath)
    switch os.platform()
      when 'darwin', 'freebsd', 'linux', 'sunos'
        unless p.indexOf('~') is -1
          home = @env.HOME || @env.HOMEPATH || @env.USERPROFILE
          p = p.replace(/~/i, home)
        unless p.toUpperCase().indexOf('$HOME') is -1
          home = @env.HOME || @env.HOMEPATH || @env.USERPROFILE
          p = p.replace(/\$HOME/i, home)
        unless p.toUpperCase().indexOf('$GOROOT') is -1
          goroot = @env.GOROOT
          p = p.replace(/\$GOROOT/i, goroot) if goroot? and goroot isnt ''
      when 'win32'
        unless p.toUpperCase().indexOf('%HOME%') is -1
          home = @env.HOME || @env.HOMEPATH || @env.USERPROFILE
          p = p.replace(/%HOME%/i, home)
        unless p.toUpperCase().indexOf('%USERPROFILE%') is -1
          home = @env.HOME || @env.HOMEPATH || @env.USERPROFILE
          p = p.replace(/%USERPROFILE%/i, home)
        unless p.toUpperCase().indexOf('%HOMEPATH%') is -1
          home = @env.HOME || @env.HOMEPATH || @env.USERPROFILE
          p = p.replace(/%HOMEPATH%/i, home)
        unless p.toUpperCase().indexOf('%GOROOT%') is -1
          goroot = @env.GOROOT
          p = p.replace(/%GOROOT%/i, goroot) if goroot? and goroot isnt ''
    @resolveAndNormalize(p)

  replaceGoPathToken: (p, gopath) ->
    return p unless gopath? and gopath isnt ''
    gopath = if gopath.indexOf(path.delimiter) is -1 then gopath.trim() else gopath.split(path.delimiter)[0].trim()
    p = p.replace(/^\$GOPATH\//i, gopath.trim() + '/')
    p = p.replace(/^%GOPATH%/i, gopath.trim())
    return '' if not p? or p.trim() is ''
    p.trim()

  joinCommandWithPath: (p, command, checkExists, delim) ->
    return '' unless p? and p.trim() isnt ''
    return '' unless command? and command.trim() isnt ''
    checkExists = false unless delim?
    delim = path.delimiter unless delim? and delim.trim() isnt ''

    result = p.split(delim)
    result = _.map result, (item) ->
      return '' unless item? and item .trim() isnt ''
      return path.join(@resolveAndNormalize(item.trim()), command)
    result = _.filter result, (item) ->
      return false unless item? and item.length > 0 and item.trim() isnt ''
      return fs.existsSync(item) if checkExists?
      return true

  resolveAndNormalize: (p) ->
    return '' unless p? and p.trim() isnt ''
    path.resolve(path.normalize(p))
