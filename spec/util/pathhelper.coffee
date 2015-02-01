os = require('os')

module.exports =
class PathHelper

  home: ->
    switch os.platform()
      when 'darwin', 'freebsd', 'linux', 'sunos'
        return process.env.HOME
      when 'win32'
        return process.env.USERPROFILE
