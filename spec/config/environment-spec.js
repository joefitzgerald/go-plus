'use babel'
/* eslint-env jasmine */

import {getgopath} from './../../lib/config/environment'
import pathhelper from './../../lib/config/pathhelper'
import path from 'path'
import {lifecycle} from './../spec-helpers'
import temp from 'temp'

describe('executor', () => {
  let [envDir, configDir] = []
  beforeEach(() => {
    lifecycle.setup()
    envDir = temp.path('gopathenv')
    configDir = temp.path('gopathconfig')
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  describe('there is a gopath in the environment', () => {
    beforeEach(() => {
      process.env.GOPATH = envDir
      atom.config.set('go-plus.config.gopath', configDir)
    })

    it('uses the environment\'s gopath', () => {
      expect(getgopath()).toBeTruthy()
      expect(getgopath()).toBe(envDir)
    })
  })

  describe('there is no gopath in the environment or config', () => {
    beforeEach(() => {
      delete process.env.GOPATH
      atom.config.set('go-plus.config.gopath', '')
    })

    it('uses the default gopath', () => {
      expect(getgopath()).toBeTruthy()
      expect(getgopath()).toBe(path.join(pathhelper.home(), 'go'))
    })
  })

  describe('there is a gopath in config and not in the environment', () => {
    beforeEach(() => {
      delete process.env.GOPATH
      atom.config.set('go-plus.config.gopath', configDir)
    })

    it('uses the config\'s gopath', () => {
      expect(getgopath()).toBeTruthy()
      expect(getgopath()).toBe(configDir)
    })
  })
})
