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
    let actual

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

    afterEach(() => {
      actual = undefined
    })

    describe('when format on save is disabled', () => {
      beforeEach(() => {
        atom.config.set('go-plus.format.formatOnSave', false)
      })

      describe('when gofmt is the tool', () => {
        beforeEach(() => {
          atom.config.set('go-plus.format.tool', 'gofmt')
        })

        it('does not format the file on save', async () => {
          spyOn(formatter, 'format')
          await formatter.handleWillSaveEvent(editor)
          expect(formatter.format).not.toHaveBeenCalled()
        })

        it('formats the file on command', () => {
          runs(() => {
            expect(actual).not.toBe(formattedText)
            const target = atom.views.getView(editor)
            atom.commands.dispatch(target, 'golang:gofmt')
          })

          waitsFor(() => {
            return editor.getText() === formattedText
          })
        })

        describe('when gofmt writes to stderr, but otherwise succeeds', () => {
          it('still updates the buffer', () => {
            runs(() => {
              spyOn(formatter.goconfig.executor, 'execSync').andReturn({
                exitcode: 0,
                stderr: 'warning',
                stdout: formattedText
              })

              const target = atom.views.getView(editor)
              atom.commands.dispatch(target, 'golang:gofmt')
            })

            waitsFor(() => {
              return editor.getText() === formattedText
            })
          })
        })
      })
    })

    describe('when format on save is enabled', () => {
      beforeEach(() => {
        atom.config.set('go-plus.format.formatOnSave', true)
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
            runs(() => {
              formatter.handleWillSaveEvent(editor)
            })
            waitsFor(() => {
              return editor.getText() === formattedText
            })
          })
        }
      })
    })
  })
})
