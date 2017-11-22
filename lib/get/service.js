// @flow
'use babel'

import {Disposable} from 'atom'
import {GetManager} from './get-manager'
import type {GoConfig} from './../config/service'

import type {InteractiveGetOptions} from './get-manager'

export type GoGet = {
  get: (InteractiveGetOptions) => Promise<any>,
  register: (string, ?Function) => Disposable
}

class GetService {
  goconfig: GoConfig
  getmanager: GetManager

  constructor (goconfig: GoConfig, getOutput: Function) {
    this.getmanager = new GetManager(goconfig, getOutput)
  }

  dispose () {
    if (this.getmanager) {
      this.getmanager.dispose()
    }
  }

  provide (): GoGet {
    const m = this.getmanager
    return {
      get: m.get.bind(m),
      register: m.register.bind(m)
    }
  }
}

export {GetService}
