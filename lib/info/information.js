// @flow

import os from 'os'
import {getEditor} from './../utils'

import type {GoConfig} from './../config/service'
import type {PanelModel, Tab} from './../panel/tab'
import type InformationView from './information-view'

class Information implements PanelModel {
  goconfig: GoConfig
  key: string
  tab: Tab
  running: bool
  view: InformationView

  constructor (goconfig: GoConfig) {
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
  }

  async updateContent (editor: any = getEditor()) {
    if (!this.view || atom.config.get('go-plus.testing')) {
      return
    }

    const go = await this.goconfig.locator.findTool('go')
    if (!go) {
      return
    }
    const opt = this.goconfig.executor.getOptions('project')
    try {
      const results = await Promise.all([
        this.goconfig.executor.exec(go, ['version'], opt),
        this.goconfig.executor.exec(go, ['env'], opt)
      ])
      const verStdout = results[0].stdout instanceof Buffer ? results[0].stdout.toString() : results[0].stdout
      const verStderr = results[0].stderr instanceof Buffer ? results[0].stderr.toString() : results[0].stderr
      const envStdout = results[1].stdout instanceof Buffer ? results[1].stdout.toString() : results[1].stdout
      const envStderr = results[1].stderr instanceof Buffer ? results[1].stderr.toString() : results[1].stderr

      let content = '$ go version' + os.EOL
      if (verStderr && verStderr.trim()) {
        content += verStderr.trim()
      }
      if (verStdout && verStdout.trim()) {
        content += verStdout.trim()
      }
      content += os.EOL + os.EOL + '$ go env' + os.EOL
      if (envStderr && envStderr.trim()) {
        content += envStderr.trim()
      }
      if (envStdout && envStdout.trim()) {
        content += envStdout.trim()
      }
      this.view.update({content})
    } catch (e) {
      if (e.handle) {
        e.handle()
      }
      console.log(e)
      this.running = false
      return Promise.resolve()
    }
  }
}

export {Information}
