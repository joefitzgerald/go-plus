'use babel'
/* eslint-env jasmine */

import path from 'path'
import fs from 'fs-extra'
import { wordAndOffset } from './../../lib/utils'
import { lifecycle } from './../spec-helpers'
import { it, fit, ffit, beforeEach, runs } from '../async-spec-helpers' // eslint-disable-line

describe('gorename', () => {
  let gorename = null
  let editor = null
  let gopath = null
  let source = null
  let target = null

  beforeEach(async () => {
    lifecycle.setup()
    gopath = fs.realpathSync(lifecycle.temp.mkdirSync('gopath-'))
    process.env.GOPATH = gopath
    await lifecycle.activatePackage()
    const { mainModule } = lifecycle
    mainModule.provideGoConfig()
    mainModule.provideGoGet()
    gorename = mainModule.loadGorename()
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  describe('when a simple file is open', () => {
    beforeEach(async () => {
      source = path.join(__dirname, '..', 'fixtures', 'gorename')
      target = path.join(gopath, 'src', 'basic')
      fs.copySync(source, target)
      editor = await atom.workspace.open(path.join(target, 'main.go'))
    })

    it('renames a single token', async () => {
      editor.setCursorBufferPosition([4, 5])
      const info = wordAndOffset(editor)
      expect(info.word).toBe('foo')
      expect(info.offset).toBe(33)

      const file = editor.getBuffer().getPath()
      const cwd = path.dirname(file)

      const cmd = await lifecycle.mainModule
        .provideGoConfig()
        .locator.findTool('gorename')
      expect(cmd).toBeTruthy()

      const result = await gorename.runGorename(
        file,
        info.offset,
        cwd,
        'bar',
        cmd
      )
      expect(result).toBeTruthy()
      expect(result.success).toBe(true)
      expect(result.result.stdout.trim()).toBe(
        'Renamed 2 occurrences in 1 file in 1 package.'
      )

      editor.destroy()
      editor = await atom.workspace.open(path.join(target, 'main.go'))

      const expected = fs.readFileSync(
        path.join(__dirname, '..', 'fixtures', 'gorename', 'expected'),
        'utf8'
      )
      const actual = editor.getText()
      expect(actual).toBe(expected)
    })
  })
})
