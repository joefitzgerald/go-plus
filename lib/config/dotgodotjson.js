'use babel'

import fs from 'fs-extra'
import path from 'path'

class DotGoDotJson {
  constructor (options) {
    this.projects = new Map()
  }

  getProjectPaths () {
    return atom.project.getPaths()
  }

  dispose () {
    if (this.projects) {
      this.projects.clear()
    }
    this.projects = null
  }

  search () {
    const filesToCheck = []
    for (const project of this.getProjectPaths()) {
      filesToCheck.push(path.join(project, '.go.json'))
      if (fs.existsSync(path.join(project, 'cmd'))) {
        const cmds = fs.readdirSync(path.join(project, 'cmd')).filter(file => fs.statSync(path.join(project, 'cmd', file)).isDirectory())
        for (const cmd of cmds) {
          filesToCheck.push(path.join(project, 'cmd', cmd, '.go.json'))
        }
      }
    }

    const files = []
    console.log(filesToCheck)
    for (const file of filesToCheck) {
      if (fs.existsSync(file)) {
        files.push(file)
      }
    }

    if (files && files.length) {
      return files
    }
    return false
  }
}

export {DotGoDotJson}
