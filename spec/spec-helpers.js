'use babel'
/* eslint-env jasmine */

function setup () {
  jasmine.unspy(window, 'setTimeout')
  atom.config.set('go-plus.disableToolCheck', true)
}

export {setup}
