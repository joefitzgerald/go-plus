'use babel'
/* eslint-env jasmine */

import { Executor } from './../../lib/config/executor'
import pathhelper from './../../lib/config/pathhelper'
import { Locator } from './../../lib/config/locator'
import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import { lifecycle } from './../spec-helpers'

describe('Locator', () => {
  let executor = null
  let platform = null
  let arch = null
  let executableSuffix = null
  let pathkey = null
  let locator = null

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
    executor = new Executor()
    executableSuffix = ''
    pathkey = 'PATH'
    if (process.platform === 'win32') {
      platform = 'windows'
      executableSuffix = '.exe'
      pathkey = 'Path'
    }

    locator = new Locator({
      executor: executor
    })
  })

  afterEach(() => {
    lifecycle.teardown()
    if (executor !== null) {
      executor.dispose()
      executor = null
    }

    if (locator !== null) {
      locator.dispose()
      locator = null
    }

    arch = null
    platform = null
    executableSuffix = null
    pathkey = null
  })

  describe('when the environment is process.env', () => {
    it('findExecutablesInPath returns an empty array if its arguments are invalid', () => {
      expect(locator.findExecutablesInPath).toBeDefined()
      expect(locator.findExecutablesInPath(false, false).length).toBe(0)
      expect(locator.findExecutablesInPath('', false).length).toBe(0)
      expect(locator.findExecutablesInPath('abcd', false).length).toBe(0)
      expect(
        locator.findExecutablesInPath('abcd', { bleh: 'abcd' }).length
      ).toBe(0)
      expect(locator.findExecutablesInPath('abcd', 'abcd').length).toBe(0)
      expect(locator.findExecutablesInPath('abcd', []).length).toBe(0)
      expect(locator.findExecutablesInPath([], []).length).toBe(0)
    })

    it('findExecutablesInPath returns an array with elements if its arguments are valid', () => {
      expect(locator.findExecutablesInPath).toBeDefined()
      if (os.platform() === 'win32') {
        expect(
          locator.findExecutablesInPath('c:\\windows\\system32', ['cmd.exe'])
            .length
        ).toBe(1)
        expect(
          locator.findExecutablesInPath('c:\\windows\\system32', ['cmd.exe'])[0]
        ).toBe('c:\\windows\\system32\\cmd.exe')
      } else {
        expect(locator.findExecutablesInPath('/bin', ['sh']).length).toBe(1)
        expect(locator.findExecutablesInPath('/bin', ['sh'])[0]).toBe('/bin/sh')
      }
    })
  })

  describe('when the environment has a GOPATH that includes a tilde', () => {
    beforeEach(() => {
      process.env.GOPATH = path.join('~', 'go')
    })

    it('is defined', () => {
      expect(locator).toBeDefined()
      expect(locator).toBeTruthy()
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
      let candidates = locator.runtimeCandidates()
      expect(candidates).toBeTruthy()
      expect(candidates.length).toBeGreaterThan(0)
      expect(candidates[0]).toBe(go)
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
      expect(candidates[0]).toBe(gorootgo)
      expect(candidates[1]).toBe(go)
    })
  })

  describe('when the PATH has multiple directories with a go executable in it', () => {
    let godir = null
    let go1dir = null
    let go = null
    let go1 = null

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
      expect(candidates[0]).toBe(go)
      expect(candidates[1]).toBe(go1)
    })

    it('runtimeCandidates() returns candidates in the correct order when a candidate occurs multiple times in the path', () => {
      process.env[pathkey] =
        godir + path.delimiter + go1dir + path.delimiter + godir
      expect(locator.runtimeCandidates).toBeDefined()
      let candidates = locator.runtimeCandidates()
      expect(candidates).toBeTruthy()
      expect(candidates.length).toBeGreaterThan(1)
      expect(candidates[0]).toBe(go)
      expect(candidates[1]).toBe(go1)
      if (candidates.length > 2) {
        expect(candidates[2]).not.toBe(go)
      }
    })
  })

  describe('when the PATH includes a directory with go executable in it', () => {
    let godir = null

    let gopathdir = null
    let gorootdir = null
    let gorootbindir = null
    let gotooldir = null
    let go = null
    const gorootbintools = ['go', 'godoc', 'gofmt']
    const gotooldirtools = ['addr2line', 'cgo', 'cover', 'doc', 'vet']

    beforeEach(() => {
      godir = lifecycle.temp.mkdirSync('go-')
      gopathdir = lifecycle.temp.mkdirSync('gopath-')
      gorootdir = lifecycle.temp.mkdirSync('goroot-')

      gorootbindir = path.join(gorootdir, 'bin')
      gotooldir = path.join(gorootdir, 'pkg', 'tool', platform + '_' + arch)

      fs.mkdirSync(gorootbindir)
      fs.mkdirsSync(gotooldir)

      // copy our fake go binary into the fake $GOROOT/bin
      const fakeexecutable = 'go_' + platform + '_' + arch + executableSuffix
      const fakego = path.join(__dirname, 'tools', 'go', fakeexecutable)
      go = path.join(godir, 'go' + executableSuffix)
      fs.copySync(fakego, go)

      process.env[pathkey] = godir
      process.env['GOPATH'] = gopathdir
      process.env['GOROOT'] = gorootdir
      for (const tool of gorootbintools) {
        if (tool !== 'go') {
          const toolpath = path.join(gorootbindir, tool + executableSuffix)
          fs.writeFileSync(toolpath, '.', { encoding: 'utf8', mode: 511 })
        }
      }
      for (const tool of gotooldirtools) {
        const toolpath = path.join(gotooldir, tool + executableSuffix)
        fs.writeFileSync(toolpath, '.', { encoding: 'utf8', mode: 511 })
      }
    })

    it('runtimeCandidates() finds the runtime', () => {
      expect(locator.runtimeCandidates).toBeDefined()
      let candidates = locator.runtimeCandidates()
      expect(candidates).toBeTruthy()
      expect(candidates.length).toBeGreaterThan(0)
      expect(candidates[0]).toBe(go)
    })

    it('runtimes() returns the runtime', () => {
      let runtimes = null
      waitsForPromise(() => {
        return locator.runtimes().then(r => {
          runtimes = r
          return
        })
      })

      runs(() => {
        expect(runtimes).toBeTruthy()
        expect(runtimes.length).toBeGreaterThan(0)
        expect(runtimes[0].name).toBe('go1.11.1')
        expect(runtimes[0].semver).toBe('1.11.1')
        expect(runtimes[0].version).toBe(
          'go version go1.11.1 ' + platform + '/' + arch
        )
        expect(runtimes[0].path).toBe(go)
        expect(runtimes[0].GOARCH).toBe(arch)
        expect(runtimes[0].GOBIN).toBe('')
        expect(runtimes[0].GOEXE).toBe(platform === 'windows' ? '.exe' : '')
        expect(runtimes[0].GOHOSTARCH).toBe(arch)
        expect(runtimes[0].GOHOSTOS).toBe(platform)
        expect(runtimes[0].GOOS).toBe(platform)
        expect(runtimes[0].GOROOT).toBe(gorootdir)
        expect(runtimes[0].GOPATH).toBe(gopathdir)
        expect(runtimes[0].GOTOOLDIR).toBe(gotooldir)
      })
    })

    it('findTool() finds the go tool', () => {
      expect(locator.findTool).toBeDefined()
      let tool = null
      let err = null
      let done = locator
        .findTool('go')
        .then(t => {
          tool = t
          return
        })
        .catch(e => {
          err = e
        })

      waitsForPromise(() => {
        return done
      })

      runs(() => {
        expect(err).toBe(null)
        expect(tool).toBeTruthy()
        expect(tool).toBe(path.join(gorootbindir, 'go' + executableSuffix))
      })
    })

    it('findTool() finds tools in GOROOT', () => {
      let tools = ['go', 'godoc', 'gofmt']
      let runtime = false
      let tool = null
      let toolPath = false
      let done = locator.runtime().then(r => {
        runtime = r
        return
      })

      waitsForPromise(() => {
        return done
      })

      runs(() => {
        for (let toolItem of tools) {
          tool = null
          done = null
          toolPath = path.join(runtime.GOROOT, 'bin', toolItem + runtime.GOEXE)
          done = locator.findTool(toolItem).then(t => {
            tool = t
            return
          })
          waitsForPromise(() => {
            return done
          })

          runs(() => {
            expect(tool).toBeTruthy()
            expect(tool).toBe(toolPath)
          })
        }
      })
    })

    it('findTool() finds tools in GOTOOLDIR', () => {
      let tools = ['addr2line', 'cgo', 'cover', 'doc', 'vet']
      let runtime = false
      let done = locator.runtime().then(r => {
        runtime = r
        return
      })

      waitsForPromise(() => {
        return done
      })

      runs(() => {
        for (let toolItem of tools) {
          let tool = null
          let toolPath = path.join(runtime.GOTOOLDIR, toolItem + runtime.GOEXE)
          let done = locator.findTool(toolItem).then(t => {
            tool = t
            return
          })
          waitsForPromise(() => {
            return done
          })

          runs(() => {
            expect(tool).toBeTruthy()
            expect(tool).toBe(toolPath)
          })
        }
      })
    })
  })

  describe('when the path includes a directory with the gometalinter tool in it', () => {
    let gopathdir = null
    let gopathbindir = null
    let pathdir = null
    let pathtools = null
    let gopathbintools = null
    beforeEach(() => {
      pathtools = ['gometalinter', 'gb']
      gopathbintools = ['somerandomtool', 'gb']
      pathdir = lifecycle.temp.mkdirSync('path-')
      gopathdir = lifecycle.temp.mkdirSync('gopath-')
      gopathbindir = path.join(gopathdir, 'bin')
      fs.mkdirSync(gopathbindir)
      process.env['GOPATH'] = gopathdir
      process.env[pathkey] = pathdir + path.delimiter + process.env[pathkey]
      for (let tool of pathtools) {
        fs.writeFileSync(path.join(pathdir, tool + executableSuffix), '.', {
          encoding: 'utf8',
          mode: 511
        })
      }
      for (let tool of gopathbintools) {
        fs.writeFileSync(
          path.join(gopathbindir, tool + executableSuffix),
          '.',
          { encoding: 'utf8', mode: 511 }
        )
      }
    })

    it('findTool() finds tools in PATH', () => {
      runs(() => {
        for (let toolItem of pathtools) {
          let toolPath = false
          let tool = null
          let done = null

          if (gopathbintools.indexOf(toolItem) !== -1) {
            toolPath = path.join(gopathbindir, toolItem + executableSuffix)
          } else {
            toolPath = path.join(pathdir, toolItem + executableSuffix)
          }

          done = locator.findTool(toolItem).then(t => {
            tool = t
            return
          })
          waitsForPromise(() => {
            return done
          })
          runs(() => {
            done = null
            expect(tool).toBeTruthy()
            expect(tool).toBe(toolPath)
          })
        }
      })
    })

    it("findTool() finds tools in GOPATH's bin directory", () => {
      runs(() => {
        for (let toolItem of gopathbintools) {
          let tool = null
          let toolPath = false
          let done = null
          toolPath = path.join(gopathbindir, toolItem + executableSuffix)
          done = locator.findTool(toolItem).then(t => {
            tool = t
            return
          })
          waitsForPromise(() => {
            return done
          })
          runs(() => {
            expect(tool).toBeTruthy()
            expect(tool).toBe(toolPath)
          })
        }
      })
    })
  })
})
