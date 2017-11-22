// @flow
'use babel'

import pathhelper from './pathhelper'
import path from 'path'

const getenvironment = (): {[string]: ?string} => {
  const e = Object.assign({}, process.env)
  const g = getgopath()
  if (g) {
    e.GOPATH = g
  }
  e.GINKGO_EDITOR_INTEGRATION = 'true'
  return e
}

const getgopath = (): string => {
  // Preferred: The Environment
  let g = process.env.GOPATH
  if (g && g.trim() !== '') {
    return pathhelper.expand(process.env, g)
  }

  // Fallback: Atom Config
  g = atom.config.get('go-plus.config.gopath')
  if (g && g.trim() !== '') {
    return pathhelper.expand(process.env, g)
  }

  // Default gopath in go 1.8+
  return path.join(pathhelper.home(), 'go')
}

export {getenvironment, getgopath}
