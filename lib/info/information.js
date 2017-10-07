'use babel'

import os from 'os'
import {getEditor} from './../utils'

class Information {
  constructor (goconfig) {
    this.goconfig = goconfig
    this.key = 'go'
    this.tab = {
      name: 'Go',
      packageName: 'go-plus',
      icon: 'info',
      order: 100
    }
  }

  dispose () {
    this.goconfig = null
  }

  updateContent (editor = getEditor()) {
    if (!this.view || atom.config.get('go-plus.testing')) {
      return
    }

    let content = ''
    return this.goconfig.locator.findTool('go').then((go) => {
      if (!go) {
        return
      }

      const cmd = go
      let args = ['version']
      if (!this.goconfig) {
        return
      }
      return this.goconfig.executor.exec(cmd, args, 'project').then((r) => {
        content = `$ ${cmd} version` + os.EOL
        if (r.stderr && r.stderr.trim() !== '') {
          content = content + r.stderr.trim()
        }
        if (r.stdout && r.stdout.trim() !== '') {
          content = content + r.stdout.trim()
        }
        content = content + os.EOL + os.EOL
        args = ['env']
        if (!this.goconfig) {
          return
        }
        return this.goconfig.executor.exec(cmd, args, 'project')
      }).then((r) => {
        if (!r) {
          return
        }
        content = content + `$ ${cmd} env` + os.EOL
        if (r.stderr && r.stderr.trim() !== '') {
          content = content + r.stderr.trim()
        }
        if (r.stdout && r.stdout.trim() !== '') {
          content = content + r.stdout.trim()
        }
      }).then((r) => {
        this.view.update({content: content})
      })
    }).catch((e) => {
      if (e.handle) {
        e.handle()
      }
      console.log(e)
      this.running = false
      return Promise.resolve()
    })
  }
}
export {Information}
