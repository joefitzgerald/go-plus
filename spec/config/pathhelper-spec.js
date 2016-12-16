'use babel'
/* eslint-env jasmine */

import pathhelper from './../../lib/config/pathhelper'
import os from 'os'
import path from 'path'
import {lifecycle} from './../spec-helpers'

describe('pathhelper', () => {
  let gopathToken = ''

  beforeEach(() => {
    lifecycle.setup()
    runs(() => {
      gopathToken = '$GOPATH'
      if (os.platform() === 'win32') {
        gopathToken = '%GOPATH%'
      }
    })
  })

  describe('when working with a single-item path', () => {
    it('expands the path', () => {
      let env = Object.assign({}, process.env)
      env.GOPATH = '~' + path.sep + 'go'

      let result = pathhelper.expand(env, path.join('~', 'go', 'go', '..', 'bin', 'goimports'))
      expect(result).toBeDefined()
      expect(result).toBeTruthy()
      expect(result).toBe(path.join(pathhelper.home(), 'go', 'bin', 'goimports'))

      result = pathhelper.expand(env, path.join(gopathToken, 'go', '..', 'bin', 'goimports'))
      expect(result).toBeDefined()
      expect(result).toBeTruthy()
      expect(result).toBe(path.join(pathhelper.home(), 'go', 'bin', 'goimports'))

      let root = path.sep
      let nonexistentKey = '$NONEXISTENT'
      if (os.platform() === 'win32') {
        root = 'c:' + path.sep
        nonexistentKey = '%NONEXISTENT%'
      }
      result = pathhelper.expand(env, path.join(root, nonexistentKey, 'go', '..', 'bin', 'goimports'))
      expect(result).toBeDefined()
      expect(result).toBeTruthy()
      expect(result).toBe(path.join(root, nonexistentKey, 'bin', 'goimports'))
    })
  })

  describe('when working with a multi-item path', () => {
    it('expands the path', () => {
      let env = Object.assign({}, process.env)
      env.GOPATH = '~' + path.sep + 'go' + path.delimiter + '~' + path.sep + 'othergo'

      let result = pathhelper.expand(env, path.join('~', 'go', 'go', '..', 'bin', 'goimports'))
      expect(result).toBeDefined()
      expect(result).toBeTruthy()
      expect(result).toBe(path.join(pathhelper.home(), 'go', 'bin', 'goimports'))

      result = pathhelper.expand(env, path.join(gopathToken, 'go', '..', 'bin', 'goimports'))
      expect(result).toBeDefined()
      expect(result).toBeTruthy()
      expect(result).toBe(path.join(pathhelper.home(), 'go', 'bin', 'goimports'))
    })
  })
})
