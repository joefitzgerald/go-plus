// @flow

import { Executor } from './executor'
import { Locator } from './locator'

import type { ExecutorOptions, ExecResult } from './executor'
import type { FindResult, Runtime } from './locator'

interface PublicExecutor {
  exec(string, Array<string>, ExecutorOptions): Promise<ExecResult>;
  execSync(string, Array<string>, ExecutorOptions): ExecResult;
  getOptions('file', editor: TextEditor): ExecutorOptions;
  getOptions('project', editor?: ?TextEditor): ExecutorOptions;
}

export type GoConfig = {
  executor: PublicExecutor,
  locator: {
    runtimes: () => Promise<Array<Runtime>>,
    runtime: () => Promise<false | Runtime>,
    gopath: () => string,
    findTool: string => Promise<FindResult>
  },
  environment: any
}

class ConfigService {
  executor: Executor
  locator: Locator

  constructor(getConsole: () => ?ConsoleApi) {
    this.executor = new Executor(getConsole)
    this.locator = new Locator()
  }

  dispose() {
    if (this.locator) {
      this.locator.dispose()

      // $FlowFixMe
      this.locator = null
    }

    if (this.executor) {
      this.executor.dispose()

      // $FlowFixMe
      this.executor = null
    }
  }

  provide(): GoConfig {
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

export { ConfigService }
