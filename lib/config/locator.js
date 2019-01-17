// @flow

import { CompositeDisposable } from 'atom'
import { getenvironment, getgopath } from './environment'
import * as pathhelper from './pathhelper'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { stat } from './../utils'

import type { Executor } from './executor'

export type Runtime = {
  path: string,
  version: string,
  locator: string,
  name?: string,
  semver?: string,

  GOROOT: string,
  GOEXE: string,
  GOTOOLDIR: string
}

export type FindResult = string | false

type Strategy = 'PATH' | 'DEFAULT' | 'GOROOTBIN' | 'GOTOOLDIR' | 'GOPATHBIN'

type GoLocator = {
  name: string,
  func: () => Array<string>
}

class Locator {
  runtimesCache: Array<Runtime>
  executor: Executor
  goExecutables: Array<string>
  executableSuffix: string
  pathKey: string
  subscriptions: CompositeDisposable
  goLocators: Array<GoLocator>
  toolStrategies: Map<string, Strategy>

  constructor(options?: { executor?: Executor }) {
    this.subscriptions = new CompositeDisposable()
    this.executableSuffix = ''
    this.pathKey = 'PATH'
    if (os.platform() === 'win32') {
      this.executableSuffix = '.exe'
      this.pathKey = 'Path'
    }
    this.goExecutables = [
      'go' + this.executableSuffix,
      'goapp' + this.executableSuffix
    ]
    if (options && options.executor) {
      this.executor = options.executor
    } else {
      const { Executor } = require('./executor')
      this.executor = new Executor(() => null)
    }

    this.subscriptions.add(this.executor)
    this.goLocators = [
      { name: 'goroot-locator', func: () => this.gorootLocator() }, // check $GOROOT/bin
      { name: 'config-locator', func: () => this.configLocator() }, // check Atom configuration
      { name: 'path-locator', func: () => this.pathLocator() }, // check $PATH
      { name: 'default-locator', func: () => this.defaultLocator() } // check common installation locations
    ]

    this.setKnownToolStrategies()
  }

  dispose() {
    this.resetRuntimes()
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.goLocators = []
    this.goExecutables = []
    this.toolStrategies.clear()
  }

  // Public: Get the go runtime(s).
  // Returns an array of {Object} where each item contains the output from "go
  // env", or false if no runtimes are found.
  async runtimes(): Promise<Array<Runtime>> {
    if (this.runtimesCache) {
      return this.runtimesCache
    }
    const candidates: Array<{
      locator: string,
      path: string
    }> = this.runtimeCandidates()
    if (!candidates || !candidates.length) {
      return []
    }

    // for each candidate, make sure we can execute 'go version'
    const viableCandidates: Array<{ locator: string, path: string }> = []
    for (const candidate of candidates) {
      const goversion = this.executor.execSync(candidate.path, ['version'], {
        cwd: path.dirname(candidate.path)
      })
      const stdout =
        goversion.stdout instanceof Buffer
          ? goversion.stdout.toString()
          : goversion.stdout
      if (
        goversion &&
        goversion.exitcode === 0 &&
        stdout.startsWith('go version')
      ) {
        const v = {}
        v.path = candidate.path
        v.version = stdout.replace(/\r?\n|\r/g, '')
        v.locator = candidate.locator

        const versionComponents = v.version.split(' ')
        v.name = versionComponents[2]
        v.semver = versionComponents[2]
        if (v.semver && v.semver.startsWith('go')) {
          v.semver = v.semver.substring(2, v.semver.length)
        }
        viableCandidates.push(v)
      }
    }

    // for each candidate, capture the output of 'go env -json'
    const finalCandidates = []
    for (const viableCandidate of viableCandidates) {
      const goenv = this.executor.execSync(
        viableCandidate.path,
        ['env', '-json'],
        { cwd: path.dirname(viableCandidate.path) }
      )
      const stdout =
        goenv.stdout instanceof Buffer ? goenv.stdout.toString() : goenv.stdout
      if (goenv && goenv.exitcode === 0 && stdout.trim() !== '') {
        const vars = JSON.parse(stdout)
        finalCandidates.push({ ...viableCandidate, ...vars })
      }
    }
    this.runtimesCache = finalCandidates
    return finalCandidates
  }

  // Deprecated: Use runtime() instead.
  runtimeForProject() {
    return this.runtime()
  }

  // Public: Get the go runtime.
  // Returns an {Object} which contains the output from "go env", or false if
  // no runtime is found.
  async runtime(): Promise<false | Runtime> {
    const runtimes = await this.runtimes()
    if (!runtimes || runtimes.length === 0) {
      return false
    }
    return runtimes[0]
  }

  // Public: Get the gopath.
  // Returns the GOPATH if it exists, or false if it is not defined.
  gopath() {
    return getgopath()
  }

  // Public: Find the specified tool.
  // Returns the path to the tool if found, or false if it cannot be found.
  async findTool(name: string): Promise<FindResult> {
    if (!name || name.constructor !== String || name.trim() === '') {
      return false
    }

    if (!this.toolStrategies) {
      return false
    }

    const strategy: Strategy = this.toolStrategies.get(name) || 'DEFAULT'
    switch (strategy) {
      case 'GOPATHBIN':
        return this.findToolInDelimitedEnvironmentVariable(name, 'GOPATH')
      case 'PATH':
        return this.findToolInDelimitedEnvironmentVariable(name, this.pathKey)
    }
    // for other strategies we need more info about the Go environment
    const runtime = await this.runtime()
    if (!runtime) {
      return false
    }

    if (name === 'go') {
      return runtime.path
    }

    switch (strategy) {
      case 'GOROOTBIN':
        return name === 'go' && runtime.path.endsWith('goapp' + runtime.GOEXE)
          ? path.join(runtime.GOROOT, 'bin', 'goapp' + runtime.GOEXE)
          : path.join(runtime.GOROOT, 'bin', name + runtime.GOEXE)
      case 'GOTOOLDIR':
        return path.join(runtime.GOTOOLDIR, name + runtime.GOEXE)
      default:
        return this.findToolWithDefaultStrategy(name)
    }
  }

  resetRuntimes() {
    this.runtimesCache = []
  }

  statishSync(pathValue: string) {
    let stat = false
    if (pathValue && pathValue.trim() !== '') {
      try {
        stat = fs.statSync(pathValue)
      } catch (e) {} // eslint-disable-line no-empty
    }
    return stat
  }

  async exists(p: string): Promise<boolean> {
    const s = await stat(p)
    return !!s
  }

  runtimeCandidates(): Array<{ locator: string, path: string }> {
    let candidates: Array<{ locator: string, path: string }> = []
    for (const locator of this.goLocators) {
      const paths = locator.func()
      if (Array.isArray(paths) && paths.length > 0) {
        const found = paths.map(p => ({ locator: locator.name, path: p }))
        // take the union of candidates and found, removing any duplicates
        candidates = [...new Set([...candidates, ...found])]
      }
    }
    return candidates
  }

  // Internal: Find a go installation using your Atom config. Deliberately
  // undocumented, as this method is discouraged.
  configLocator(): Array<string> {
    const goinstallation = (atom.config.get(
      'go-plus.config.goinstallation'
    ): any)
    const stat = this.statishSync(goinstallation)
    if (stat) {
      let d = goinstallation
      if (stat.isFile()) {
        d = path.dirname(goinstallation)
      }
      return this.findExecutablesInPath(d, this.goExecutables)
    }

    return []
  }

  // gorootLocator attempts to locate a go tool in $GOROOT/bin
  gorootLocator(): Array<string> {
    const g = this.environment().GOROOT
    if (!g || g.trim() === '') {
      return []
    }
    return this.findExecutablesInPath(path.join(g, 'bin'), this.goExecutables)
  }

  // pathLocator attemps to find a go binary in the directories listed in $PATH
  pathLocator() {
    return this.findExecutablesInPath(
      this.environment()[this.pathKey],
      this.goExecutables
    )
  }

  defaultLocator() {
    const installPaths: Array<string> = []
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
    return this.findExecutablesInPath(
      installPaths.join(path.delimiter),
      this.goExecutables
    )
  }

  findExecutablesInPath(
    pathValue: ?string,
    executables: Array<string>
  ): Array<string> {
    const candidates = []
    if (
      !pathValue ||
      pathValue.constructor !== String ||
      pathValue.trim() === ''
    ) {
      return candidates
    }

    if (
      !executables ||
      executables.constructor !== Array ||
      executables.length < 1
    ) {
      return candidates
    }

    const elements = pathhelper
      .expand(this.environment(), pathValue)
      .split(path.delimiter)
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
  environment() {
    return getenvironment()
  }

  rawEnvironment() {
    return Object.assign({}, process.env)
  }

  // Internal: Set the strategy for finding known or built-in tools.
  // Returns a map where the key is the tool name and the value is the strategy.
  setKnownToolStrategies() {
    this.toolStrategies = new Map()

    // Built-In Tools
    this.toolStrategies.set('go', 'GOROOTBIN')
    this.toolStrategies.set('gofmt', 'GOROOTBIN')
    this.toolStrategies.set('godoc', 'GOROOTBIN')

    this.toolStrategies.set('addr2line', 'GOTOOLDIR')
    this.toolStrategies.set('api', 'GOTOOLDIR')
    this.toolStrategies.set('asm', 'GOTOOLDIR')
    this.toolStrategies.set('buildid', 'GOTOOLDIR')
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
    this.toolStrategies.set('test2json', 'GOTOOLDIR')
    this.toolStrategies.set('trace', 'GOTOOLDIR')
    this.toolStrategies.set('vet', 'GOTOOLDIR')

    // External Tools
    this.toolStrategies.set('git', 'PATH')

    // Other Tools Are Assumed To Be In PATH or GOBIN or GOPATH/bin
  }

  // Internal: Handle the specified error, if needed.
  handleError(err: any) {
    if (err.handle) {
      err.handle()
    }
  }

  // Internal: Try to find a tool with the default strategy (GOPATH/bin, then PATH).
  // Returns the path to the tool, or false if it cannot be found.
  findToolWithDefaultStrategy(name: string): FindResult {
    // Default Strategy Is: Look For The Tool In GOPATH, Then Look In PATH
    return (
      this.findToolInDelimitedEnvironmentVariable(name, 'GOPATH') ||
      this.findToolInDelimitedEnvironmentVariable(name, this.pathKey)
    )
  }

  // Internal: Try to find a tool in a delimited environment variable (e.g. PATH).
  // Returns the path to the tool, or false if it cannot be found.
  findToolInDelimitedEnvironmentVariable(
    toolName: string,
    key: string
  ): FindResult {
    if (
      !toolName ||
      toolName.constructor !== String ||
      toolName.trim() === ''
    ) {
      return false
    }

    const p = this.environment()[key]
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

export { Locator }
