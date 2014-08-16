_ = require 'underscore-plus'
os = require 'os'
Executor = require './executor'

module.exports =
class Environment

  Clone: ->
    unless os.platform() is 'darwin'
      return _.clone(process.env)

    env = _.clone(process.env)
    return env
