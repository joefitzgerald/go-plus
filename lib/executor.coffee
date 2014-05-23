{exec} = require 'child_process'

module.exports =
class Executor

  exec: (@command, @cwd, @env, @callback, @args...) ->
    @args.unshift @command
    commandWithArgs = @args.join(" ")
    options =
      encoding: 'utf8'
      timeout: 0
      maxBuffer: 200*1024
      killSignal: 'SIGTERM'
      cwd: null
      env: null
    options.cwd = @cwd if cwd? and cwd isnt ''
    options.env = @env if env?
    @childProc = exec(commandWithArgs, options, @callback)
