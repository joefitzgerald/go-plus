'use babel'
/* eslint-env jasmine */

import fs from 'fs-extra'
import path from 'path'
import {lifecycle} from './../spec-helpers'

describe('go-get', () => {
  let manager = null
  let gopath
  let platform
  let arch
  let executableSuffix = ''
  let pathkey = 'PATH'
  let go

  beforeEach(() => {
    runs(() => {
      lifecycle.setup()

      gopath = fs.realpathSync(lifecycle.temp.mkdirSync('gopath-'))
      const goroot = fs.realpathSync(lifecycle.temp.mkdirSync('goroot-'))
      const gorootbin = path.join(goroot, 'bin')
      fs.mkdirSync(gorootbin)
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

      if (process.platform === 'win32') {
        platform = 'windows'
        executableSuffix = '.exe'
        pathkey = 'Path'
      }
      const fakeexecutable = 'go_' + platform + '_' + arch + executableSuffix
      const configPath = path.join(__dirname, '..', 'config')
      const fakego = path.join(configPath, 'tools', 'go', fakeexecutable)
      go = path.join(gorootbin, 'go' + executableSuffix)
      fs.copySync(fakego, go)
      let gojson = path.join(configPath, 'fixtures', 'go-' + platform + '.json')
      fs.copySync(gojson, path.join(gorootbin, 'go.json'))
      process.env[pathkey] = gorootbin
      process.env['GOPATH'] = gopath
      process.env['GOROOT'] = goroot
    })

    waitsForPromise(() => {
      return lifecycle.activatePackage()
    })

    runs(() => {
      const { mainModule } = lifecycle
      mainModule.provideGoGet()
      manager = mainModule.getservice.getmanager
    })
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  describe('manager', () => {
    let gocodebinary
    let goimportsbinary
    beforeEach(() => {
      fs.mkdirSync(path.join(gopath, 'bin'))
      gocodebinary = path.join(gopath, 'bin', 'gocode' + executableSuffix)
      fs.writeFileSync(gocodebinary, '', {encoding: 'utf8', mode: 511})
      goimportsbinary = path.join(gopath, 'bin', 'goimports' + executableSuffix)
      fs.writeFileSync(goimportsbinary, '', {encoding: 'utf8', mode: 511})
    })

    it('updates packages', () => {
      let outcome
      runs(() => {
        let stat = fs.statSync(gocodebinary)
        expect(stat.size).toBe(0)
        manager.register('github.com/mdempsky/gocode')
        manager.register('golang.org/x/tools/cmd/goimports')
      })

      waitsForPromise({timeout: 30000}, () => {
        return manager.updateTools().then((o) => {
          outcome = o
        })
      })

      runs(() => {
        let stat = fs.statSync(gocodebinary)
        expect(stat.size).toBeGreaterThan(0)
        stat = fs.statSync(goimportsbinary)
        expect(stat.size).toBeGreaterThan(0)

        expect(outcome).toBeTruthy()
        expect(outcome.success).toBe(true)
        expect(outcome.results).toBeTruthy()
        expect(outcome.results.length).toBe(2)
      })
    })

    it('calls the callback after updating packages, if provided', () => {
      let outcome
      let callbackOutcome
      let callbackCalled
      runs(() => {
        let stat = fs.statSync(gocodebinary)
        expect(stat.size).toBe(0)
        manager.register('golang.org/x/tools/cmd/goimports', (o) => {
          callbackCalled = true
          callbackOutcome = o
        })
      })

      waitsForPromise({timeout: 30000}, () => {
        return manager.updateTools().then((o) => {
          outcome = o
        })
      })

      runs(() => {
        expect(callbackCalled).toBe(true)
        expect(outcome).toBeTruthy()
        expect(outcome.success).toBe(true)
        expect(outcome.results).toBeTruthy()
        expect(outcome.results.length).toBe(1)
        expect(outcome.results[0].pack).toBe('golang.org/x/tools/cmd/goimports')
        expect(callbackOutcome).toBe(outcome)
      })
    })
  })
})
