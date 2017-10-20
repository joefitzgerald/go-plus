'use babel'

import {GetManager} from './get-manager'

class GetService {
  constructor (goconfig, getOutput) {
    this.getmanager = new GetManager(goconfig, getOutput)
  }

  dispose () {
    if (this.getmanager) {
      this.getmanager.dispose()
    }
    this.getmanager = null
  }

  provide () {
    const m = this.getmanager
    return {
      get: m.get.bind(m),
      register: m.register.bind(m)
    }
  }
}

export {GetService}
