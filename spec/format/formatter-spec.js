'use babel'
/* eslint-env jasmine */

import fs from 'fs'
import path from 'path'
import { lifecycle } from './../spec-helpers'
import {it, fit, ffit, beforeEach} from '../async-spec-helpers' // eslint-disable-line

function setTextAndSave(editor) {
  const buffer = editor.getBuffer()
  buffer.setText(unformattedText)
  return Promise.resolve(buffer.save())
}

const nl = '\n'
const unformattedText =
  'package main' + nl + nl + 'func main()  {' + nl + '}' + nl
const formattedText = 'package main' + nl + nl + 'func main() {' + nl + '}' + nl

describe('formatter', () => {
  let formatter = null

  beforeEach(async () => {
    lifecycle.setup()
    atom.config.set('editor.defaultLineEnding', 'LF')
    atom.config.set('go-plus.test.runTestsOnSave', false)
    await lifecycle.activatePackage()
    const { mainModule } = lifecycle
    mainModule.provideGoConfig()
    mainModule.provideGoGet()
    formatter = mainModule.loadFormatter()
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  describe('when a simple file is opened', () => {
    let editor
    let filePath
    let saveSubscription
    let actual

    beforeEach(async () => {
      const directory = fs.realpathSync(lifecycle.temp.mkdirSync())
      atom.project.setPaths([directory])
      filePath = path.join(directory, 'gofmt.go')
      fs.writeFileSync(filePath, '')
      editor = await atom.workspace.open(filePath)
      saveSubscription = editor.onDidSave(() => {
        actual = editor.getText()
      })
      return
    })

    afterEach(() => {
      if (saveSubscription) {
        saveSubscription.dispose()
      }
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

        it('does not format the file on save', () => {
          runs(async () => {
            await setTextAndSave(editor, unformattedText)
          })
          waitsFor(() => actual)
          runs(() => {
            expect(actual).toBe(unformattedText)
            expect(actual).not
          })
        })

        it('formats the file on command', async () => {
          runs(async () => {
            await setTextAndSave(editor, unformattedText)
          })
          waitsFor(() => actual)
          runs(() => {
            expect(actual).toBe(unformattedText)
            expect(actual).not.toBe(formattedText)
            const target = atom.views.getView(editor)
            atom.commands.dispatch(target, 'golang:gofmt')
            expect(editor.getText()).toBe(formattedText)
          })
        })

        describe('when gofmt writes to stderr, but otherwise succeeds', () => {
          it('still updates the buffer', async () => {
            spyOn(formatter.goconfig.executor, 'execSync').andReturn({
              exitcode: 0,
              stderr: 'warning',
              stdout: formattedText
            })

            await setTextAndSave(editor, unformattedText)
            const target = atom.views.getView(editor)
            atom.commands.dispatch(target, 'golang:gofmt')
            expect(editor.getText()).toBe(formattedText)
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
          atom.config.set('go-plus.format.tool', tool)

          it('formats on save using ' + tool, () => {
            runs(async () => {
              await setTextAndSave(editor, unformattedText)
            })
            waitsFor(() => actual)
            runs(() => {
              expect(actual).toBe(formattedText)
            })
          })
        }
      })
    })
  })
})
