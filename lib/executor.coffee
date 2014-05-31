{exec} = require 'child_process'
{BufferedProcess} = require 'atom'

module.exports =
class Executor

  exec: (command, cwd, env, callback, args) ->
    output = ''
    error = ''
    code = 0
    options =
      cwd: null
      env: null
    options.cwd = @cwd if cwd? and cwd isnt ''
    options.env = @env if env?
    options.env = process.env if options.env?
    stdout = (data) -> output += data
    stderr = (data) -> error += data
    exit = (data) ->
      code = data
      callback(code, output, error)
    process = new BufferedProcess({command, args, options, stdout, stderr, exit})
