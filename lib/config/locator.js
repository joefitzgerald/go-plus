'use babel'

import {CompositeDisposable} from 'atom'
import {getenvironment, getgopath} from './environment'
import pathhelper from './pathhelper'
import _ from 'lodash'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {stat} from './../utils'

class Locator {
  constructor (options) {
    this.subscriptions = new CompositeDisposable()
    this.executor = null
    this.executableSuffix = ''
    this.pathKey = 'PATH'
    if (os.platform() === 'win32') {
      this.executableSuffix = '.exe'
      this.pathKey = 'Path'
    }
    this.goExecutables = ['go' + this.executableSuffix, 'goapp' + this.executableSuffix]
    if (options && options.executor) {
      this.executor = options.executor
    } else {
      const {Executor} = require('./executor')
      this.executor = new Executor()
    }

    this.subscriptions.add(this.executor)
    this.goLocators = [
      // Avoid using gorootLocator / GOROOT unless you know what you're doing
      // (and assume you don't know what you're doing unless you have
      // significant go experience)
      () => { return this.gorootLocator() },
      () => { return this.editorconfigLocator() },
      () => { return this.configLocator() },
      () => { return this.pathLocator() },
      () => { return this.defaultLocator() }
    ]

    this.setKnownToolStrategies()
  }

  dispose () {
    this.resetRuntimes()
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.goLocators = null
    this.executableSuffix = null
    this.pathKey = null
    this.goExecutables = null
    this.subscriptions = null
    this.executor = null
    this.toolStrategies = null
  }

  // Public: Get the go runtime(s).
  // Returns an array of {Object} where each item contains the output from "go
  // env", or false if no runtimes are found.
  runtimes (options = {}) {
    if (this.runtimesCache) {
      return Promise.resolve(this.runtimesCache)
    }

    return new Promise((resolve, reject) => {
      const candidates = this.runtimeCandidates(options)
      if (!candidates || !candidates.length) {
        return resolve([])
      }

      const viableCandidates = []
      for (const candidate of candidates) {
        const goversion = this.executor.execSync(candidate, ['version'], {cwd: path.dirname(candidate)})
        if (goversion && goversion.exitcode === 0 && goversion.stdout.startsWith('go ')) {
          const v = {path: candidate, version: goversion.stdout.replace(/\r?\n|\r/g, '')}
          const versionComponents = v.version.split(' ')
          v.name = versionComponents[2]
          v.semver = versionComponents[2]
          if (v.semver.startsWith('go')) {
            v.semver = v.semver.substring(2, v.semver.length)
          }
          viableCandidates.push(v)
        }
      }

      const finalCandidates = []
      for (const viableCandidate of viableCandidates) {
        const goenv = this.executor.execSync(viableCandidate.path, ['env'], {cwd: path.dirname(viableCandidate.path)})
        if (goenv && goenv.exitcode === 0 && goenv.stdout.trim() !== '') {
          const items = goenv.stdout.split('\n')
          for (let item of items) {
            item = item.replace(/[\n\r]/g, '')
            if (item.includes('=')) {
              const tuple = item.split('=')
              let key = tuple[0]
              let value = tuple[1]
              if (tuple.length > 2) {
                value = tuple.slice(1, tuple.length + 1).join('=')
              }
              if (os.platform() === 'win32') {
                if (key.startsWith('set ')) {
                  key = key.substring(4, key.length)
                }
              } else {
                if (value.length > 2) {
                  value = value.substring(1, value.length - 1)
                } else {
                  value = ''
                }
              }
              viableCandidate[key] = value
            }
          }
          finalCandidates.push(viableCandidate)
        }
      }

      this.runtimesCache = finalCandidates
      resolve(this.runtimesCache)
    })
  }

  // Deprecated: Use runtime(options) instead.
  runtimeForProject (project) {
    return this.runtime()
  }

  // Public: Get the go runtime.
  // Returns an {Object} which contains the output from "go env", or false if
  // no runtime is found.
  runtime (options = {}) {
    return this.runtimes(options).then((r) => {
      if (!r || r.length < 1) {
        return false
      } else {
        return r[0]
      }
    })
  }

  // Public: Get the gopath.
  // Returns the GOPATH if it exists, or false if it is not defined.
  gopath (options = {}) {
    return getgopath()
  }

  // Public: Find the specified tool.
  // Returns the path to the tool if found, or false if it cannot be found.
  findTool (name, options = {}) {
    if (!name || name.constructor !== String || name.trim() === '') {
      return Promise.resolve(false)
    }

    if (!this.toolStrategies) {
      return Promise.resolve(false)
    }

    let strategy = false
    return Promise.resolve(null).then(() => {
      if (this.toolStrategies && this.toolStrategies.has(name)) {
        strategy = this.toolStrategies.get(name)
      }
      if (!strategy) {
        strategy = 'DEFAULT'
      }
    }).then(() => {
      if (strategy !== 'GOROOTBIN' && strategy !== 'GOTOOLDIR') {
        return false
      }

      return this.runtime(options).then((runtime) => {
        if (!runtime) {
          return false
        }

        if (strategy === 'GOROOTBIN') {
          if (name === 'go' && runtime.path.endsWith('goapp' + runtime.GOEXE)) {
            return path.join(runtime.GOROOT, 'bin', 'goapp' + runtime.GOEXE)
          }

          return path.join(runtime.GOROOT, 'bin', name + runtime.GOEXE)
        } else if (strategy === 'GOTOOLDIR') {
          return path.join(runtime.GOTOOLDIR, name + runtime.GOEXE)
        }
        return false
      })
    }).then((specificTool) => {
      if (specificTool) {
        return stat(specificTool).then((s) => {
          if (s && s.isFile()) {
            return specificTool
          }
        }).catch((err) => {
          this.handleError(err)
          return false
        })
      }

      if (strategy === 'GOPATHBIN') {
        return this.findToolInDelimitedEnvironmentVariable(name, 'GOPATH', options)
      }

      if (strategy === 'PATH') {
        return this.findToolInDelimitedEnvironmentVariable(name, this.pathKey, options)
      }

      return this.findToolWithDefaultStrategy(name, options)
    })
  }

  resetRuntimes () {
    this.runtimesCache = null
  }

  statishSync (pathValue) {
    let stat = false
    if (pathValue && pathValue.trim() !== '') {
      try { stat = fs.statSync(pathValue) } catch (e) { }
    }
    return stat
  }

  pathExists (p) {
    return this.exists(p).then((e) => {
      if (!e) {
        return false
      }
      return p
    })
  }

  fileExists (p) {
    return stat(p).then((s) => {
      if (!s) {
        return false
      }

      if (s.isFile()) {
        return p
      }

      return false
    })
  }

  directoryExists (p) {
    return stat(p).then((s) => {
      if (!s) {
        return false
      }

      if (s.isDirectory()) {
        return p
      }

      return false
    })
  }

  exists (p) {
    return stat(p).then((s) => {
      return !!s
    })
  }

  runtimeCandidates (options = {}) {
    let candidates = []
    for (const locator of this.goLocators) {
      const c = locator(options)
      if (c && c.constructor === Array && c.length > 0) {
        candidates = _.union(candidates, c)
      }
    }
    return candidates
  }

  editorconfigLocator (options = {}) {
    // TODO: .editorconfig
    return false
  }

  // Internal: Find a go installation using your Atom config. Deliberately
  // undocumented, as this method is discouraged.
  configLocator (options = {}) {
    const goinstallation = atom.config.get('go-plus.config.goinstallation')
    const stat = this.statishSync(goinstallation)
    if (stat) {
      let d = goinstallation
      if (stat.isFile()) {
        d = path.dirname(goinstallation)
      }
      return this.findExecutablesInPath(d, this.executables, options)
    }

    return []
  }

  gorootLocator (options = {}) {
    const g = this.environment(options).GOROOT
    if (!g || g.trim() === '') {
      return []
    }
    return this.findExecutablesInPath(path.join(g, 'bin'), this.goExecutables, options)
  }

  pathLocator (options = {}) {
    return this.findExecutablesInPath(this.environment(options)[this.pathKey], this.goExecutables, options)
  }

  defaultLocator (options = {}) {
    const installPaths = []
    if (os.platform() === 'win32') {
      /*
      c:\go\bin = Binary Distribution
      c:\tools\go\bin = Chocolatey
      */
      installPaths.push(path.join('c:', 'go', 'bin'))
      installPaths.push(path.join('c:', 'tools', 'go', 'bin'))
    } else {
      /*
      /usr/local/go/bin = Binary Distribution
      /usr/local/bin = Homebrew
      */
      installPaths.push(path.join('/', 'usr', 'local', 'go', 'bin'))
      installPaths.push(path.join('/', 'usr', 'local', 'bin'))
    }
    return this.findExecutablesInPath(installPaths.join(path.delimiter), this.goExecutables, options)
  }

  findExecutablesInPath (pathValue, executables, options = {}) {
    const candidates = []
    if (!pathValue || pathValue.constructor !== String || pathValue.trim() === '') {
      return candidates
    }

    if (!executables || executables.constructor !== Array || executables.length < 1) {
      return candidates
    }

    const elements = pathhelper.expand(this.environment(options), pathValue).split(path.delimiter)
    for (const element of elements) {
      for (const executable of executables) {
        const candidate = path.join(element, executable)
        const stat = this.statishSync(candidate)
        if (stat && stat.isFile() && stat.size > 0) {
          candidates.push(candidate)
        }
      }
    }
    return candidates
  }

  // Internal: Get a copy of the environment, with the GOPATH correctly set.
  // Returns an {Object} where the key is the environment variable name and the value is the environment variable value.
  environment (options = {}) {
    return getenvironment()
  }

  rawEnvironment (options = {}) {
    return Object.assign({}, process.env)
  }

  // Internal: Set the strategy for finding known or built-in tools.
  // Returns a map where the key is the tool name and the value is the strategy.
  setKnownToolStrategies () {
    this.toolStrategies = new Map()

    // Built-In Tools
    this.toolStrategies.set('go', 'GOROOTBIN')
    this.toolStrategies.set('gofmt', 'GOROOTBIN')
    this.toolStrategies.set('godoc', 'GOROOTBIN')
    this.toolStrategies.set('addr2line', 'GOTOOLDIR')
    this.toolStrategies.set('api', 'GOTOOLDIR')
    this.toolStrategies.set('asm', 'GOTOOLDIR')
    this.toolStrategies.set('cgo', 'GOTOOLDIR')
    this.toolStrategies.set('compile', 'GOTOOLDIR')
    this.toolStrategies.set('cover', 'GOTOOLDIR')
    this.toolStrategies.set('dist', 'GOTOOLDIR')
    this.toolStrategies.set('doc', 'GOTOOLDIR')
    this.toolStrategies.set('fix', 'GOTOOLDIR')
    this.toolStrategies.set('link', 'GOTOOLDIR')
    this.toolStrategies.set('nm', 'GOTOOLDIR')
    this.toolStrategies.set('objdump', 'GOTOOLDIR')
    this.toolStrategies.set('pack', 'GOTOOLDIR')
    this.toolStrategies.set('pprof', 'GOTOOLDIR')
    this.toolStrategies.set('tour', 'GOTOOLDIR')
    this.toolStrategies.set('trace', 'GOTOOLDIR')
    this.toolStrategies.set('vet', 'GOTOOLDIR')
    this.toolStrategies.set('yacc', 'GOTOOLDIR')

    // External Tools
    this.toolStrategies.set('git', 'PATH')

    // Other Tools Are Assumed To Be In PATH or GOBIN or GOPATH/bin
    // GOPATHBIN Can Be Used In The Future As A Strategy, If Required
    // GOPATHBIN Will Understand GO15VENDOREXPERIMENT
  }

  // Internal: Handle the specified error, if needed.
  handleError (err) {
    if (err.handle) {
      err.handle()
    }
    // console.log(err)
  }

  // Internal: Try to find a tool with the default strategy (GOPATH/bin, then
  // PATH).
  // Returns the path to the tool, or false if it cannot be found.
  findToolWithDefaultStrategy (name, options = {}) {
    if (!name || name.constructor !== String || name.trim() === '') {
      return Promise.resolve(false)
    }

    // Default Strategy Is: Look For The Tool In GOPATH, Then Look In PATH
    return Promise.resolve().then(() => {
      return this.findToolInDelimitedEnvironmentVariable(name, 'GOPATH', options)
    }).then((tool) => {
      if (tool) {
        return tool
      }
      return this.findToolInDelimitedEnvironmentVariable(name, this.pathKey, options)
    })
  }

  // Internal: Try to find a tool in a delimited environment variable (e.g.
  // PATH).
  // Returns the path to the tool, or false if it cannot be found.
  findToolInDelimitedEnvironmentVariable (toolName, key, options = {}) {
    if (!toolName || toolName.constructor !== String || toolName.trim() === '') {
      return false
    }

    const p = this.environment(options)[key]
    if (!p) {
      return false
    }

    const elements = p.split(path.delimiter)
    for (const element of elements) {
      let item = ''
      if (key === 'GOPATH') {
        item = path.join(element, 'bin', toolName + this.executableSuffix)
      } else {
        item = path.join(element, toolName + this.executableSuffix)
      }

      if (fs.existsSync(item)) {
        const stat = fs.statSync(item)
        if (stat && stat.isFile() && stat.size > 0) {
          return item
        }
      }
    }

    return false
  }
}

export {Locator}
