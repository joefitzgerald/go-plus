/* eslint-env jasmine */

import { ranges } from './../../lib/test/gocover-parser'
import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import { lifecycle } from './../spec-helpers'
import {it, fit, ffit, beforeEach} from '../async-spec-helpers' // eslint-disable-line

describe('gocover-parser', () => {
  let goconfig = null
  let env
  let directory
  let filePath
  let testFilePath

  beforeEach(async () => {
    lifecycle.setup()
    await lifecycle.activatePackage()
    goconfig = lifecycle.mainModule.provideGoConfig()

    directory = lifecycle.temp.mkdirSync()
    env = Object.assign({}, goconfig.environment())
    env['GOPATH'] = directory
    filePath = path.join(
      directory,
      'src',
      'github.com',
      'testuser',
      'example',
      'go-plus.go'
    )
    testFilePath = path.join(
      directory,
      'src',
      'github.com',
      'testuser',
      'example',
      'go-plus_test.go'
    )
    fs.ensureDirSync(path.dirname(filePath))
    fs.ensureDirSync(path.dirname(testFilePath))
    fs.writeFileSync(
      filePath,
      'package main\n\nimport "fmt"\n\nfunc main()  {\n\tfmt.Println(Hello())\n}\n\nfunc Hello() string {\n\treturn "Hello, 世界"\n}\n'
    )
    fs.writeFileSync(
      testFilePath,
      'package main\n\nimport "testing"\n\nfunc TestHello(t *testing.T) {\n\tresult := Hello()\n\tif result != "Hello, 世界" {\n\t\tt.Errorf("Expected %s - got %s", "Hello, 世界", result)\n\t}\n}'
    )
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  it('parses the file for a single package', async () => {
    let cmd
    let tempDir = lifecycle.temp.mkdirSync()
    let tempFile = path.join(tempDir, 'coverage.out')
    let args = ['test', '-coverprofile=' + tempFile]
    let cwd = path.join(directory, 'src', 'github.com', 'testuser', 'example')
    cmd = await goconfig.locator.findTool('go')
    expect(cmd).toBeTruthy()

    let executorOptions = { cwd: cwd, env: env }
    const execResult = await goconfig.executor.exec(cmd, args, executorOptions)
    expect(execResult.exitcode).toBe(0)
    expect(execResult.stderr).toBeFalsy()
    expect(execResult.stdout).toBeTruthy()

    let retext = '^' + path.join(directory, 'src') + path.sep
    if (os.platform() === 'win32') {
      retext = retext.replace(/\\/g, '\\\\')
    }

    let re = new RegExp(retext)
    let packagePath = filePath.replace(re, '')

    let r = ranges(tempFile)
    expect(r).toBeTruthy()
    expect(r.length).toBeGreaterThan(0)
    const result = r.filter(item => filePath.endsWith(item.file))
    console.log('ranges', r) // eslint-disable-line no-console
    console.log('filtered for ' + filePath, result) // eslint-disable-line no-console
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
