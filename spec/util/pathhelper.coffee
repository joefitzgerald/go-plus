os = require('os')
temp = require('temp').track()
fs = require('fs')

module.exports =
class PathHelper

  home: ->
    switch os.platform()
      when 'darwin', 'freebsd', 'linux', 'sunos'
        return process.env.HOME
      when 'win32'
        return process.env.USERPROFILE

  # Creates a temporary GOPATH. If a callback is provided, the callback will
  # be invoked with the new GOPATH.
  @createTempGopath: (cb) ->
    oldGopath = process.env.GOPATH
    oldGopathSetting = atom.config.get('go-plus.goPath')
    oldEnvOverrideSetting = atom.config.get('go-plus.environmentOverridesConfiguration')
    beforeEach ->
      tempGopath = fs.realpathSync(temp.mkdirSync())
      process.env.GOPATH = tempGopath
      atom.config.set('go-plus.goPath', tempGopath)
      atom.config.set('go-plus.environmentOverridesConfiguration', false)
      cb?(tempGopath)
    afterEach ->
      process.env.GOPATH = oldGopath
      atom.config.set('go-plus.goPath', oldGopathSetting)
      atom.config.set('go-plus.environmentOverridesConfiguration', oldEnvOverrideSetting)
