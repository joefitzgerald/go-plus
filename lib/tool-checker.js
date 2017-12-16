// @flow

import type {GoConfig} from './config/service'

class ToolChecker {
  goconfig: GoConfig

  constructor (goconfig: GoConfig) {
    this.goconfig = goconfig
  }

  async checkForTools (tools: Array<string>) {
    if (!tools || !tools.length) {
      return
    }
    const promises = tools.filter(tool => !!tool).map(tool => this.goconfig.locator.findTool(tool))
    const results = await Promise.all(promises)
    if (results.some(cmd => !cmd)) {
      atom.commands.dispatch(atom.views.getView(atom.workspace), 'golang:update-tools')
    }
  }
}

export {ToolChecker}
