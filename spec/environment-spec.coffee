_ = require('underscore-plus')
path = require('path')
os = require('os')
Environment = require('./../lib/environment')

describe 'executor', ->
  [environment] = []

  describe 'when the DYLD_INSERT_LIBRARIES variable is not set', ->
    beforeEach ->
      env = _.clone(process.env)
      env.PATH = '/usr/bin:/bin:/usr/sbin:/sbin'
      environment = new Environment(env)

    describe 'when cloning the environment on OS X', ->
      it 'uses /usr/libexec/path_helper to build the PATH', ->
        if os.platform() is 'darwin'
          env = environment.Clone()
          expect(env).toBeDefined()
          expect(env.PATH).toBeDefined()
          expect(env.PATH).not.toBe('')
          expect(env.PATH).not.toBe('/usr/bin:/bin:/usr/sbin:/sbin')

    it 'the DYLD_INSERT_LIBRARIES variable is undefined', ->
      env = environment.Clone()
      expect(env).toBeDefined()
      expect(env.SOME_RANDOM_NONEXISTENT_VARIABLE).toBe(undefined)
      expect(env.DYLD_INSERT_LIBRARIES).toBe(undefined)

  describe 'when the DYLD_INSERT_LIBRARIES variable is set', ->
    beforeEach ->
      env = _.clone(process.env)
      env.PATH = '/usr/bin:/bin:/usr/sbin:/sbin'
      env.DYLD_INSERT_LIBRARIES = '/path/to/some/library'
      environment = new Environment(env)

    it 'unsets the DYLD_INSERT_LIBRARIES variable', ->
      env = environment.Clone()
      expect(env).toBeDefined()
      expect(env.SOME_RANDOM_NONEXISTENT_VARIABLE).toBe(undefined)
      expect(env.DYLD_INSERT_LIBRARIES).toBe(undefined)
