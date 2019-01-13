// @flow

import { Disposable } from 'atom'
import { GetManager } from './get-manager'
import type { MultiGetResult } from './get-manager'
import type { GoConfig } from './../config/service'

import type { InteractiveGetOptions } from './get-manager'

export type GoGet = {
  get: InteractiveGetOptions => Promise<?MultiGetResult>,
  register: (string, ?Function) => Disposable
}

class GetService {
  goconfig: GoConfig
  getmanager: GetManager

  constructor(
    goconfig: GoConfig,
    getOutput: Function,
    busySignal: () => ?BusySignalService
  ) {
    this.getmanager = new GetManager(goconfig, getOutput, busySignal)
  }

  dispose() {
    if (this.getmanager) {
      this.getmanager.dispose()
    }
  }

  provide(): GoGet {
    const m = this.getmanager
    return {
      get: m.get.bind(m),
      register: m.register.bind(m)
    }
  }
}

export { GetService }
