'use babel'
/* eslint-env jasmine */

import { ranges } from './../../lib/test/gocover-parser'
import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import _ from 'lodash'
import { lifecycle } from './../spec-helpers'

describe('gocover-parser', () => {
  let goconfig = null
  let env
  let directory
  let filePath
  let testFilePath

  beforeEach(() => {
    runs(() => {
      lifecycle.setup()
    })

    waitsForPromise(() => {
      return lifecycle.activatePackage()
    })

    runs(() => {
      goconfig = lifecycle.mainModule.provideGoConfig()
    })

    runs(() => {
      directory = lifecycle.temp.mkdirSync()
      env = Object.assign({}, goconfig.environment())
      env['GOPATH'] = directory
      filePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'go-plus.go')
      testFilePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'go-plus_test.go')
      fs.ensureDirSync(path.dirname(filePath))
      fs.ensureDirSync(path.dirname(testFilePath))
      fs.writeFileSync(filePath, 'package main\n\nimport "fmt"\n\nfunc main()  {\n\tfmt.Println(Hello())\n}\n\nfunc Hello() string {\n\treturn "Hello, 世界"\n}\n')
      fs.writeFileSync(testFilePath, 'package main\n\nimport "testing"\n\nfunc TestHello(t *testing.T) {\n\tresult := Hello()\n\tif result != "Hello, 世界" {\n\t\tt.Errorf("Expected %s - got %s", "Hello, 世界", result)\n\t}\n}')
    })
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  it('parses the file for a single package correctly', () => {
    let cmd
    let tempDir = lifecycle.temp.mkdirSync()
    let tempFile = path.join(tempDir, 'coverage.out')
    let args = ['test', '-coverprofile=' + tempFile]
    let cwd = path.join(directory, 'src', 'github.com', 'testuser', 'example')
    let p = goconfig.locator.findTool('go').then((c) => {
      expect(c).toBeTruthy()
      cmd = c
    })

    waitsForPromise(() => {
      return p
    })

    runs(() => {
      let executorOptions = { cwd: cwd, env: env }
      p = goconfig.executor.exec(cmd, args, executorOptions).then((r) => {
        expect(r.exitcode).toBe(0)
        expect(r.stderr).toBeFalsy()
        expect(r.stdout).toBeTruthy()
      })
    })

    waitsForPromise(() => {
      return p
    })

    runs(() => {
      let retext = '^' + path.join(directory, 'src') + path.sep
      if (os.platform() === 'win32') {
        retext = retext.replace(/\\/g, '\\\\')
      }

      let re = new RegExp(retext)
      let packagePath = filePath.replace(re, '')

      let r = ranges(tempFile)
      expect(r).toBeTruthy()
      expect(r.length).toBeGreaterThan(0)

      let result = _.filter(r, (r) => { return _.endsWith(filePath, r.file) })
      expect(result).toBeTruthy()
      expect(result.length).toBe(2)
      expect(result[0]).toBeDefined()
      expect(result[0].range.start).toBeDefined()
      expect(result[0].range.end).toBeDefined()
      expect(result[0].range.start.column).toBe(13)
      expect(result[0].range.start.row).toBe(4)
      expect(result[0].range.end.column).toBe(1)
      expect(result[0].range.end.row).toBe(6)
      expect(result[0].count).toBe(0)
      expect(result[0].file).toBe(packagePath)

      expect(result[1]).toBeDefined()
      expect(result[1].range.start).toBeDefined()
      expect(result[1].range.end).toBeDefined()
      expect(result[1].range.start.column).toBe(20)
      expect(result[1].range.start.row).toBe(8)
      expect(result[1].range.end.column).toBe(1)
      expect(result[1].range.end.row).toBe(10)
      expect(result[1].count).toBe(1)
      expect(result[1].file).toBe(packagePath)
    })
  })
})
