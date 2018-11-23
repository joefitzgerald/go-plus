'use babel'
/* eslint-env jasmine */

import fs from 'fs-extra'
import path from 'path'
import { lifecycle } from './../spec-helpers'
import { it, fit, ffit, beforeEach, runs } from '../async-spec-helpers' // eslint-disable-line

describe('Highlight Provider', () => {
  let highlight

  beforeEach(async () => {
    lifecycle.setup()
    await lifecycle.activatePackage()

    const { mainModule } = lifecycle
    mainModule.provideGoConfig()
    highlight = mainModule.provideCodeHighlight()
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  it('monitors the config', () => {
    atom.config.set('go-plus.guru.highlightIdentifiers', false)
    expect(highlight.shouldDecorate).toBe(false)
    atom.config.set('go-plus.guru.highlightIdentifiers', true)
    expect(highlight.shouldDecorate).toBe(true)
    atom.config.set('go-plus.guru.highlightIdentifiers', false)
    expect(highlight.shouldDecorate).toBe(false)
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

      atom.config.set('go-plus.guru.highlightIdentifiers', true)

      editor = await atom.workspace.open(path.join(target || '.', 'doc.go'))
    })

    it('returns the appropriate ranges', async () => {
      editor.setCursorBufferPosition([22, 1])

      const ranges = await highlight.highlight(
        editor,
        editor.getCursorBufferPosition()
      )
      expect(ranges.length).toBe(3)
      expect(ranges[0].start.row).toBe(22)
      expect(ranges[1].start.row).toBe(23)
      expect(ranges[2].start.row).toBe(24)
    })
  })
})
