'use babel'
/* eslint-env jasmine */

import fs from 'fs'
import path from 'path'
import {lifecycle} from './../spec-helpers'

const nl = '\n'
const unformattedText = 'package main' + nl + nl + 'func main()  {' + nl + '}' + nl
const formattedText = 'package main' + nl + nl + 'func main() {' + nl + '}' + nl

describe('formatter', () => {
  let mainModule = null
  let formatter = null

  beforeEach(() => {
    runs(() => {
      lifecycle.setup()
      atom.packages.triggerDeferredActivationHooks()
      atom.config.set('editor.defaultLineEnding', 'LF')
    })

    waitsForPromise(() => {
      return atom.packages.activatePackage('language-go')
    })

    runs(() => {
      const pack = atom.packages.loadPackage('go-plus')
      pack.activateNow()
      atom.packages.triggerActivationHook('core:loaded-shell-environment')
      atom.packages.triggerActivationHook('language-go:grammar-used')
      mainModule = pack.mainModule
      mainModule.provideGoConfig()
      mainModule.provideGoGet()
      mainModule.loadFormatter()
    })

    waitsFor(() => { return mainModule && mainModule.loaded })

    waitsFor(() => {
      formatter = mainModule.formatter
      return formatter
    })
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  describe('when a simple file is opened', () => {
    let editor
    let filePath
    let saveSubscription
    let actual

    beforeEach(() => {
      const directory = fs.realpathSync(lifecycle.temp.mkdirSync())
      atom.project.setPaths([directory])
      filePath = path.join(directory, 'gofmt.go')
      fs.writeFileSync(filePath, '')
      waitsForPromise(() => {
        return atom.workspace.open(filePath).then((e) => {
          editor = e
          saveSubscription = e.onDidSave(() => {
            actual = e.getText()
          })
        })
      })
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
          runs(() => {
            const buffer = editor.getBuffer()
            buffer.setText(unformattedText)
            buffer.save()
          })

          waitsFor(() => { return actual })

          runs(() => {
            expect(actual).toBe(unformattedText)
            expect(actual).not.toBe(formattedText)
          })
        })

        it('formats the file on command', () => {
          runs(() => {
            const buffer = editor.getBuffer()
            buffer.setText(unformattedText)
            buffer.save()
          })

          waitsFor(() => {
            return actual
          })

          runs(() => {
            expect(actual).toBe(unformattedText)
            expect(actual).not.toBe(formattedText)
            const target = atom.views.getView(editor)
            atom.commands.dispatch(target, 'golang:gofmt')
          })

          runs(() => {
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
            runs(() => {
              const buffer = editor.getBuffer()
              buffer.setText(unformattedText)
              buffer.save()
            })

            waitsFor(() => {
              return actual
            })

            runs(() => {
              expect(actual).toBe(formattedText)
            })
          })
        }
      })
    })
  })
})
