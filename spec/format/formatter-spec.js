'use babel'
/* eslint-env jasmine */

import path from 'path'
import { ConfigService } from '../../lib/config/service'
import { Formatter } from '../../lib/format/formatter'
import { it, fit, ffit, beforeEach, runs } from '../async-spec-helpers' // eslint-disable-line

const nl = '\n'
const formattedText = 'package main' + nl + nl + 'func main() {' + nl + '}' + nl

describe('formatter', () => {
  let formatter = null

  beforeEach(async () => {
    await atom.packages.activatePackage('language-go')
    atom.config.set('editor.defaultLineEnding', 'LF')
    atom.config.set('go-plus.test.runTestsOnSave', false)
    formatter = new Formatter(new ConfigService().provide())
  })

  afterEach(() => {
    formatter.dispose()
  })

  describe('when a simple file is opened', () => {
    let editor

    beforeEach(async () => {
      const filePath = path.join(
        __dirname,
        '..',
        'fixtures',
        'format',
        'gofmt.go'
      )
      editor = await atom.workspace.open(filePath)
    })

    describe('for each tool', () => {
      for (const tool of ['gofmt', 'goimports', 'goreturns']) {
        it('formats on save using ' + tool, () => {
          runs(() => {
            atom.config.set('go-plus.format.tool', tool)
          })
          waitsFor(() => {
            return formatter.tool === tool
          })
          runs(async () => {
            const result = await formatter.formatEntireFile(editor, null)
            expect(result).toBeTruthy()
            expect(result.formatted).toEqual(formattedText)
          })
        })
      }
    })
  })
})
