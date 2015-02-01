_ = require('underscore-plus')
os = require('os')
fs = require('fs-plus')
Executor = require('./executor')

module.exports =
class Environment
  constructor: (environment) ->
    @environment = environment
    
  Clone: ->
    env = _.clone(@environment)
    env.DYLD_INSERT_LIBRARIES = undefined if env.DYLD_INSERT_LIBRARIES?
    return env unless os.platform() is 'darwin' and env.PATH is '/usr/bin:/bin:/usr/sbin:/sbin'
    pathhelper = '/usr/libexec/path_helper'
    return env unless fs.existsSync(pathhelper)
    executor = new Executor(env)
    result = executor.execSync(pathhelper)
    return env if result.code isnt 0
    return env if result.stderr? and result.stderr isnt ''
    matcher = /^PATH="(.*?)";/img
    match = matcher.exec(result.stdout)
    return env unless match?
    env.PATH = match[1]
    return env
