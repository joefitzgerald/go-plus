/* eslint-env jasmine */
// @flow

import { Executor } from './../../lib/config/executor'
import * as pathhelper from './../../lib/config/pathhelper'
import { Locator } from './../../lib/config/locator'
import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import { lifecycle } from './../spec-helpers'
import { it, fit, ffit, beforeEach, runs } from '../async-spec-helpers' // eslint-disable-line

describe('Locator', () => {
  let executor = null
  let platform = ''
  let arch = ''
  let executableSuffix = ''
  let pathkey = ''
  let locator: Locator

  beforeEach(() => {
    lifecycle.setup()
    if (process.env.GOROOT) {
      delete process.env.GOROOT
    }
    platform = process.platform
    if (process.arch === 'arm') {
      arch = 'arm'
    } else if (process.arch === 'ia32') {
      // Ugh, Atom is 32-bit on Windows... for now.
      if (platform === 'win32') {
        arch = 'amd64'
      } else {
        arch = '386'
      }
    } else {
      arch = 'amd64'
    }
    executor = new Executor(() => null)
    executableSuffix = ''
    pathkey = 'PATH'
    if (process.platform === 'win32') {
      platform = 'windows'
      executableSuffix = '.exe'
      pathkey = 'Path'
    }

    locator = new Locator({ executor })
  })

  afterEach(() => {
    lifecycle.teardown()
    if (executor !== null) {
      executor.dispose()
      executor = null
    }

    if (locator) {
      locator.dispose()
    }
  })

  describe('when the environment is process.env', () => {
    it('findExecutablesInPath returns an array with elements if its arguments are valid', () => {
      expect(locator.findExecutablesInPath).toBeDefined()
      if (os.platform() === 'win32') {
        const r = locator.findExecutablesInPath('c:\\windows\\system32', [
          'cmd.exe'
        ])
        expect(r.length).toBe(1)
        expect(r[0]).toBe('c:\\windows\\system32\\cmd.exe')
      } else {
        const r = locator.findExecutablesInPath('/bin', ['sh'])
        expect(r.length).toBe(1)
        expect(r[0]).toBe('/bin/sh')
      }
    })
  })

  describe('when the environment has a GOPATH that includes a tilde', () => {
    beforeEach(() => {
      process.env.GOPATH = path.join('~', 'go')
    })

    it('gopath() returns a path with the home directory expanded', () => {
      expect(locator.gopath).toBeDefined()
      expect(locator.gopath()).toBe(path.join(pathhelper.home(), 'go'))
    })

    describe('when there is atom config for go-plus.config.gopath', () => {
      beforeEach(() => {
        atom.config.set('go-plus.config.gopath', '~/go2')
      })

      it('gopath() prioritizes the environment over the config', () => {
        expect(locator.gopath).toBeDefined()
        expect(locator.gopath()).toBe(path.join(pathhelper.home(), 'go'))
      })
    })
  })

  describe('when the environment has an empty GOPATH', () => {
    beforeEach(() => {
      if (process.env.GOPATH) {
        delete process.env.GOPATH
      }
    })

    it('gopath() returns the default GOPATH', () => {
      expect(locator.gopath).toBeDefined()
      expect(locator.gopath()).toBe(path.join(os.homedir(), 'go'))
    })

    describe('when there is atom config for go-plus.config.gopath', () => {
      beforeEach(() => {
        atom.config.set('go-plus.config.gopath', '~/go')
      })

      it('gopath() returns the expanded value for ~/go', () => {
        expect(locator.gopath).toBeDefined()
        expect(locator.gopath()).toBe(path.join(pathhelper.home(), 'go'))
      })
    })

    describe('when there is atom config for go-plus.config.gopath', () => {
      beforeEach(() => {
        atom.config.set('go-plus.config.gopath', '~/go')
      })

      it('gopath() returns the expanded value for ~/go', () => {
        expect(locator.gopath).toBeDefined()
        expect(locator.gopath()).toBe(path.join(pathhelper.home(), 'go'))
      })
    })
  })

  describe('when the environment has a GOPATH that is whitespace', () => {
    beforeEach(() => {
      process.env.GOPATH = '        '
    })

    it('gopath() returns the default GOPATH', () => {
      expect(locator.gopath).toBeDefined()
      expect(locator.gopath()).toBe(path.join(os.homedir(), 'go'))
    })

    describe('when there is atom config for go-plus.config.gopath', () => {
      beforeEach(() => {
        atom.config.set('go-plus.config.gopath', '~/go')
      })

      it('gopath() returns the expanded value for ~/go', () => {
        expect(locator.gopath).toBeDefined()
        expect(locator.gopath()).toBe(path.join(pathhelper.home(), 'go'))
      })
    })

    describe('when there is atom config for go-plus.config.gopath', () => {
      beforeEach(() => {
        atom.config.set('go-plus.config.gopath', '~/go')
      })

      it('gopath() returns the expanded value for ~/go', () => {
        expect(locator.gopath).toBeDefined()
        expect(locator.gopath()).toBe(path.join(pathhelper.home(), 'go'))
      })
    })
  })

  describe('when the PATH has a single directory with a go executable in it', () => {
    let godir = null
    let go = null
    beforeEach(() => {
      godir = lifecycle.temp.mkdirSync('go-')
      go = path.join(godir, 'go' + executableSuffix)
      fs.writeFileSync(go, '.', { encoding: 'utf8', mode: 511 })
      process.env[pathkey] = godir
      process.env.GOPATH = path.join('~', 'go')
    })

    it('runtimeCandidates() finds the runtime', () => {
      expect(locator.runtimeCandidates).toBeDefined()
      const candidates = locator.runtimeCandidates()
      expect(candidates).toBeTruthy()
      expect(candidates.length).toBeGreaterThan(0)
      expect(candidates[0].path).toBe(go)
    })
  })

  describe('when GOROOT is set and the go tool is available within $GOROOT/bin', () => {
    // a temporary $PATH where we place a fake go executable
    let godir = null
    let go = null

    // a temporary $GOROOT/bin directory where we place a fake go executable
    let gorootgo = null
    let gorootdir = null
    let gorootbindir = null

    beforeEach(() => {
      gorootdir = lifecycle.temp.mkdirSync('goroot-')
      gorootbindir = path.join(gorootdir, 'bin')
      fs.mkdirSync(gorootbindir)
      gorootgo = path.join(gorootbindir, 'go' + executableSuffix)

      godir = lifecycle.temp.mkdirSync('go-')
      go = path.join(godir, 'go' + executableSuffix)

      fs.writeFileSync(gorootgo, '.', { encoding: 'utf8', mode: 511 })
      fs.writeFileSync(go, '.', { encoding: 'utf8', mode: 511 })

      process.env[pathkey] = godir
      process.env.GOROOT = gorootdir
      process.env.GOPATH = path.join('~', 'go')
    })

    afterEach(() => {
      process.env.GOROOT = ''
    })

    it('runtimeCandidates() finds the runtime and orders the go in $GOROOT/bin before the go in PATH', () => {
      expect(locator.runtimeCandidates).toBeDefined()
      let candidates = locator.runtimeCandidates()
      expect(candidates).toBeTruthy()
      expect(candidates.length).toBeGreaterThan(1)
      expect(candidates[0].path).toBe(gorootgo)
      expect(candidates[1].path).toBe(go)
    })
  })

  describe('when the PATH has multiple directories with a go executable in it', () => {
    let godir = ''
    let go1dir = ''
    let go = ''
    let go1 = ''

    beforeEach(() => {
      godir = lifecycle.temp.mkdirSync('go-')
      go1dir = lifecycle.temp.mkdirSync('go1-')
      go = path.join(godir, 'go' + executableSuffix)
      go1 = path.join(go1dir, 'go' + executableSuffix)
      fs.writeFileSync(go, '.', { encoding: 'utf8', mode: 511 })
      fs.writeFileSync(go1, '.', { encoding: 'utf8', mode: 511 })
      process.env[pathkey] = godir + path.delimiter + go1dir
    })

    it('runtimeCandidates() returns the candidates in the correct order', () => {
      expect(locator.runtimeCandidates).toBeDefined()
      let candidates = locator.runtimeCandidates()
      expect(candidates).toBeTruthy()
      expect(candidates.length).toBeGreaterThan(1)
      expect(candidates[0].path).toBe(go)
      expect(candidates[1].path).toBe(go1)
    })

    it('runtimeCandidates() returns candidates in the correct order when a candidate occurs multiple times in the path', () => {
      process.env[pathkey] =
        godir + path.delimiter + go1dir + path.delimiter + godir
      expect(locator.runtimeCandidates).toBeDefined()
      let candidates = locator.runtimeCandidates()
      expect(candidates).toBeTruthy()
      expect(candidates.length).toBeGreaterThan(1)
      expect(candidates[0].path).toBe(go)
      expect(candidates[1].path).toBe(go1)
      if (candidates.length > 2) {
        expect(candidates[2]).not.toBe(go)
      }
    })
  })

  describe('when a go executable exists in $PATH and not in $GOROOT/bin', () => {
    let tempPath = ''
    let tempGoroot = ''
    let tempGopath = ''

    let gorootbindir = ''
    let gotooldir = ''
    let goInPath = ''

    const gorootbintools = ['go', 'godoc', 'gofmt']
    const gotooldirtools = ['addr2line', 'cgo', 'cover', 'doc', 'vet']

    beforeEach(() => {
      tempPath = lifecycle.temp.mkdirSync('path-')
      tempGoroot = lifecycle.temp.mkdirSync('goroot-')
      tempGopath = lifecycle.temp.mkdirSync('gopath-')

      gorootbindir = path.join(tempGoroot, 'bin')
      gotooldir = path.join(tempGoroot, 'pkg', 'tool', platform + '_' + arch)

      fs.mkdirSync(gorootbindir)
      fs.mkdirsSync(gotooldir)

      // copy our fake go binary into our temporary $PATH dir
      const fakeexecutable = 'go_' + platform + '_' + arch + executableSuffix
      const fakego = path.join(__dirname, 'tools', 'go', fakeexecutable)
      goInPath = path.join(tempPath, 'go' + executableSuffix)
      fs.copySync(fakego, goInPath)

      process.env[pathkey] = tempPath
      process.env['GOROOT'] = tempGoroot
      process.env['GOPATH'] = tempGopath

      // write dummy tools to $GOROOT/bin
      for (const tool of gorootbintools) {
        if (tool !== 'go') {
          const toolpath = path.join(gorootbindir, tool + executableSuffix)
          fs.writeFileSync(toolpath, '.', { encoding: 'utf8', mode: 511 })
        }
      }
      // write dummy tools to $GOROOT/pkg/tool
      for (const tool of gotooldirtools) {
        const toolpath = path.join(gotooldir, tool + executableSuffix)
        fs.writeFileSync(toolpath, '.', { encoding: 'utf8', mode: 511 })
      }
    })

    it('runtimeCandidates() finds go', () => {
      expect(locator.runtimeCandidates).toBeDefined()
      let candidates = locator.runtimeCandidates()
      expect(candidates).toBeTruthy()
      expect(candidates.length).toBeGreaterThan(0)
      expect(candidates[0].path).toBe(goInPath)
    })

    it('runtimes() returns the runtime', async () => {
      const runtimes = await locator.runtimes()
      expect(runtimes).toBeTruthy()
      expect(runtimes.length).toBeGreaterThan(0)

      const rt: any = runtimes[0]
      expect(rt.locator).toBe('path-locator')
      expect(rt.name).toBe('go1.99.1')
      expect(rt.semver).toBe('1.99.1')
      expect(rt.version).toBe('go version go1.99.1 ' + platform + '/' + arch)
      expect(rt.path).toBe(goInPath)
      expect(rt.GOARCH).toBe(arch)
      expect(rt.GOBIN).toBe('')
      expect(rt.GOEXE).toBe(platform === 'windows' ? '.exe' : '')
      expect(rt.GOHOSTARCH).toBe(arch)
      expect(rt.GOHOSTOS).toBe(platform)
      expect(rt.GOOS).toBe(platform)
      expect(rt.GOROOT).toBe(tempGoroot)
      expect(rt.GOPATH).toBe(tempGopath)
      expect(rt.GOTOOLDIR).toBe(gotooldir)
    })

    it('findTool() finds the go tool', async () => {
      expect(locator.findTool).toBeDefined()
      const tool = await locator.findTool('go')
      expect(tool).toBe(path.join(tempPath, 'go' + executableSuffix))
    })

    it('findTool() finds tools in GOROOT', async () => {
      const tools = ['godoc', 'gofmt']
      const runtime = await locator.runtime()
      expect(runtime).toBeTruthy()
      if (runtime) {
        for (const toolItem of tools) {
          const toolPath = path.join(
            runtime.GOROOT,
            'bin',
            toolItem + runtime.GOEXE
          )
          const tool = await locator.findTool(toolItem)
          expect(tool).toBe(toolPath)
        }
      }
    })

    it('findTool() finds tools in GOTOOLDIR', async () => {
      const tools = ['addr2line', 'cgo', 'cover', 'doc', 'vet']
      const runtime = await locator.runtime()
      expect(runtime).toBeTruthy()
      if (runtime) {
        for (const toolItem of tools) {
          const toolPath = path.join(
            runtime.GOTOOLDIR,
            toolItem + runtime.GOEXE
          )
          const tool = await locator.findTool(toolItem)
          expect(tool).toBe(toolPath)
        }
      }
    })
  })

  describe('when the path includes a directory with the gometalinter tool in it', () => {
    let gopathdir = ''
    let gopathbindir = ''
    let pathdir = ''
    const pathtools = ['gometalinter', 'gb']
    const gopathbintools = ['somerandomtool', 'gb']

    beforeEach(() => {
      pathdir = lifecycle.temp.mkdirSync('path-')
      gopathdir = lifecycle.temp.mkdirSync('gopath-')
      gopathbindir = path.join(gopathdir, 'bin')
      fs.mkdirSync(gopathbindir)
      process.env['GOPATH'] = gopathdir
      process.env[pathkey] =
        pathdir + path.delimiter + (process.env[pathkey] || '')

      const opts = { encoding: 'utf8', mode: 511 }
      for (const tool of pathtools) {
        const fp = path.join(pathdir, tool + executableSuffix)
        fs.writeFileSync(fp, '.', opts)
      }
      for (const tool of gopathbintools) {
        const fp = path.join(gopathbindir, tool + executableSuffix)
        fs.writeFileSync(fp, '.', opts)
      }
    })

    it('findTool() finds tools in PATH', async () => {
      for (const toolItem of pathtools) {
        const toolPath = gopathbintools.includes(toolItem)
          ? path.join(gopathbindir, toolItem + executableSuffix)
          : path.join(pathdir, toolItem + executableSuffix)
        const tool = await locator.findTool(toolItem)
        expect(tool).toBe(toolPath)
      }
    })

    it("findTool() finds tools in GOPATH's bin directory", async () => {
      for (const toolItem of gopathbintools) {
        const toolPath = path.join(gopathbindir, toolItem + executableSuffix)
        const tool = await locator.findTool(toolItem)
        expect(tool).toBe(toolPath)
      }
    })
  })
})
