'use babel'
/* eslint-env jasmine */

import { Executor } from './../../lib/config/executor'
import * as pathhelper from './../../lib/config/pathhelper'
import os from 'os'
import path from 'path'
import { lifecycle } from './../spec-helpers'
import { it, fit, ffit, beforeEach, runs } from '../async-spec-helpers' // eslint-disable-line

describe('executor', () => {
  let executor = null
  let prefix = null

  beforeEach(() => {
    lifecycle.setup()
    prefix = '/'
    if (os.platform() === 'win32') {
      prefix = 'C:\\'
    }
    executor = new Executor()
  })

  describe('when asynchronously executing a command', () => {
    it('succeeds', async () => {
      let command = 'env'
      if (os.platform() === 'win32') {
        command = path.resolve(
          __dirname,
          'tools',
          'env',
          'env_windows_amd64.exe'
        )
      }

      const result = await executor.exec(command, [], { cwd: prefix })
      expect(result).toBeDefined()
      expect(result.exitcode).toBeDefined()
      expect(result.exitcode).toBe(0)
      expect(result.stdout).toBeDefined()
      expect(result.stdout).not.toBe('')
      expect(result.stderr).toBeDefined()
      expect(result.stderr).toBe('')
      expect(result.error).toBeFalsy()
    })

    it('sets the working directory correctly', async () => {
      let command = 'pwd'
      if (os.platform() === 'win32') {
        command = path.resolve(
          __dirname,
          'tools',
          'pwd',
          'pwd_windows_amd64.exe'
        )
      }

      const result = await executor.exec(command, [], {
        cwd: pathhelper.home()
      })
      expect(result).toBeDefined()
      expect(result.exitcode).toBeDefined()
      expect(result.exitcode).toBe(0)
      expect(result.stdout).toBeDefined()
      expect(result.stdout).toBe(pathhelper.home() + '\n')
      expect(result.stderr).toBeDefined()
      expect(result.stderr).toBe('')
      expect(result.error).toBeFalsy()
    })

    it('sets the environment correctly', async () => {
      let command = 'env'
      if (os.platform() === 'win32') {
        command = path.resolve(
          __dirname,
          'tools',
          'env',
          'env_windows_amd64.exe'
        )
      }
      let env = { testenv: 'testing' }
      const result = await executor.exec(command, [], { env })

      expect(result).toBeDefined()
      expect(result.exitcode).toBeDefined()
      expect(result.exitcode).toBe(0)
      expect(result.stdout).toBeDefined()
      expect(result.stdout).toContain('testenv=testing\n')
      expect(result.stderr).toBeDefined()
      expect(result.stderr).toBe('')
      expect(result.error).toBeFalsy()
    })

    it('handles and returns an ENOENT error if the command was not found', async () => {
      const result = await executor.exec(
        'nonexistentcommand',
        [],
        executor.getOptions()
      )
      expect(result).toBeTruthy()
      expect(result.error).toBeTruthy()
      expect(result.error.errno).toBe('ENOENT')
      expect(result.error.message).toBe('spawn nonexistentcommand ENOENT')
      expect(result.error.path).toBe('nonexistentcommand')
      expect(result.exitcode).toBe(127)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBeDefined()
      if (os.platform() === 'win32') {
        expect(result.stderr).toBe(
          "'nonexistentcommand' is not recognized as an internal or external command,\r\noperable program or batch file.\r\n"
        )
      } else {
        expect(result.stderr).toBe('')
      }
    })
  })

  describe('when synchronously executing a command', () => {
    it('succeeds', () => {
      let command = 'env'
      if (os.platform() === 'win32') {
        command = path.resolve(
          __dirname,
          'tools',
          'env',
          'env_windows_amd64.exe'
        )
      }

      let result = executor.execSync(command, [], executor.getOptions())
      expect(result.exitcode).toBeDefined()
      expect(result.exitcode).toBe(0)
      expect(result.stdout).toBeDefined()
      expect(result.stdout).not.toBe('')
      expect(result.stderr).toBeDefined()
      expect(result.stderr).toBe('')
      expect(result.error).toBeFalsy()
    })

    it('returns a message if the command was not found', () => {
      let result = executor.execSync(
        'nonexistentcommand',
        [],
        executor.getOptions()
      )
      expect(result.exitcode).toBeDefined()
      expect(result.exitcode).toBe(127)
      expect(result.stdout).toBeDefined()
      expect(result.stdout).toBe('')
      expect(result.stderr).toBeDefined()
      expect(result.stderr).toBe('')
      expect(result.error).toBeTruthy()
      expect(result.error.code).toBe('ENOENT')
      expect(result.error.errno).toBe('ENOENT')
      expect(result.error.message).toBe('spawnSync nonexistentcommand ENOENT')
      expect(result.error.path).toBe('nonexistentcommand')
    })
  })
})
