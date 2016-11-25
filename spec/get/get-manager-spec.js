'use babel'
/* eslint-env jasmine */

import temp from 'temp'
import fs from 'fs-plus'
import path from 'path'
import os from 'os'

describe('go-get', () => {
  let mainModule = null
  let manager = null
  temp.track()

  beforeEach(() => {
    atom.config.set('go-plus.disableToolCheck', true)
    let pack = atom.packages.loadPackage('go-plus')
    pack.activateNow()
    mainModule = pack.mainModule

    waitsFor(() => {
      return mainModule.getGoconfig()
    })

    waitsFor(() => {
      return mainModule.getGetManager()
    })

    runs(() => {
      manager = mainModule.getGetManager()
    })
  })

  describe('manager', () => {
    let oldEnv
    let gopath
    let gocodebinary
    let goimportsbinary
    beforeEach(() => {
      let exeSuffix = ''
      if (os.platform() === 'win32') {
        exeSuffix = '.exe'
      }
      oldEnv = process.env
      gopath = fs.realpathSync(temp.mkdirSync('gopath-'))
      process.env.GOPATH = gopath
      fs.mkdirSync(path.join(gopath, 'bin'))
      gocodebinary = path.join(gopath, 'bin', 'gocode' + exeSuffix)
      fs.writeFileSync(gocodebinary, '', {encoding: 'utf8', mode: 511})
      goimportsbinary = path.join(gopath, 'bin', 'goimports' + exeSuffix)
      fs.writeFileSync(goimportsbinary, '', {encoding: 'utf8', mode: 511})
    })

    afterEach(() => {
      process.env = oldEnv
    })

    it('updates packages', () => {
      let outcome
      runs(() => {
        let stat = fs.statSync(gocodebinary)
        expect(stat.size).toBe(0)
        manager.register('github.com/nsf/gocode')
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
