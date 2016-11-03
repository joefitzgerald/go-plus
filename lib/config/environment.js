'use babel'

import pathhelper from './pathhelper'

const getenvironment = () => {
  const e = Object.assign({}, process.env)
  const g = getgopath()
  if (g) {
    e.GOPATH = g
  }
  return e
}

const getgopath = () => {
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

  return false
}

export {getenvironment, getgopath}
