'use babel'
/* eslint-env jasmine */

import fs from 'fs-extra'
import path from 'path'
import { lifecycle } from './../spec-helpers'
import { it, fit, ffit, beforeEach, runs } from '../async-spec-helpers' // eslint-disable-line

describe('what', () => {
  let what

  beforeEach(async () => {
    lifecycle.setup()
    await lifecycle.activatePackage()

    const { mainModule } = lifecycle
    mainModule.provideGoConfig()
    what = mainModule.loadWhat()
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  it('monitors the config', () => {
    atom.config.set('go-plus.guru.highlightIdentifiers', false)
    expect(what.shouldDecorate).toBe(false)
    atom.config.set('go-plus.guru.highlightIdentifiers', true)
    expect(what.shouldDecorate).toBe(true)
    atom.config.set('go-plus.guru.highlightIdentifiers', false)
    expect(what.shouldDecorate).toBe(false)
  })

  describe('when run on a valid go file', () => {
    let editor
    let gopath = null
    let source = null
    let target = null

    beforeEach(async () => {
      gopath = fs.realpathSync(lifecycle.temp.mkdirSync('gopath-'))
      process.env.GOPATH = gopath

      source = path.join(__dirname, '..', 'fixtures')
      target = path.join(gopath, 'src', 'what')
      fs.copySync(source, target)

      // we'll manually invoke guru for easier testing
      atom.config.set('go-plus.guru.highlightIdentifiers', false)

      editor = await atom.workspace.open(path.join(target || '.', 'doc.go'))
    })

    it('highlights identifiers', async () => {
      editor.setCursorBufferPosition([22, 1])

      await what.run(
        editor,
        editor.getCursorBufferPosition(),
        editor.getCursors()[0],
        true
      )

      expect(what.currentEditorLayer).toBeTruthy()
      const markers = what.currentEditorLayer.getMarkers()
      expect(markers.length).toBe(3)
      expect(markers[0].getBufferRange().start.row).toBe(22)
      expect(markers[1].getBufferRange().start.row).toBe(23)
      expect(markers[2].getBufferRange().start.row).toBe(24)
    })
  })
})
