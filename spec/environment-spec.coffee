_ = require 'underscore-plus'
path = require 'path'
os = require 'os'
Environment = require './../lib/environment'

describe "executor", ->
  [environment] = []

  beforeEach ->
    env = _.clone(process.env)
    env.PATH = '/usr/bin:/bin:/usr/sbin:/sbin'
    environment = new Environment(env)

  describe "when cloning the environment on OS X", ->
    it "uses /usr/libexec/path_helper to build the PATH", ->
      if os.platform() is 'darwin'
        env = environment.Clone()
        expect(env).toBeDefined
        expect(env.PATH).toBeDefined
        expect(env.PATH).not.toBe ''
        expect(env.PATH).not.toBe '/usr/bin:/bin:/usr/sbin:/sbin'
