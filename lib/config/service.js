'use babel'

import {Executor} from './executor'
import {Locator} from './locator'

class ConfigService {
  constructor (options) {
    this.executor = new Executor()
    this.locator = new Locator()
  }

  dispose () {
    if (this.locator) {
      this.locator.dispose()
    }
    this.locator = null
    if (this.executor) {
      this.executor.dispose()
    }
    this.executor = null
  }

  provide () {
    const e = this.executor
    const l = this.locator
    return {
      executor: {
        exec: e.exec.bind(e),
        execSync: e.execSync.bind(e),
        getOptions: e.getOptions.bind(e)
      },
      locator: {
        runtimes: l.runtimes.bind(l),
        runtime: l.runtime.bind(l),
        gopath: l.gopath.bind(l),
        findTool: l.findTool.bind(l)
      },
      environment: l.environment.bind(l)
    }
  }
}

export {ConfigService}
