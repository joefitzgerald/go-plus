'use babel'
/* eslint-env jasmine */

import path from 'path'
import fs from 'fs-plus'
import {lifecycle} from './../spec-helpers'

describe('go to definition', () => {
  let godef = null
  let gopath = null
  let mainModule = null

  beforeEach(() => {
    runs(() => {
      lifecycle.setup()
      gopath = fs.realpathSync(lifecycle.temp.mkdirSync('gopath-'))
      process.env.GOPATH = gopath
    })

    waitsForPromise(() => {
      return atom.packages.activatePackage('language-go')
    })

    runs(() => {
      let pack = atom.packages.loadPackage('go-plus')
      pack.activateNow()
      mainModule = pack.mainModule
      mainModule.getGoconfig()
      mainModule.getGoget()
      godef = mainModule.getGodef()
    })

    waitsFor(() => { return mainModule && mainModule.loaded })
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  describe('when invoked on a valid project file', () => {
    let sourceDir
    let targetDir
    let editor

    beforeEach(() => {
      runs(() => {
        sourceDir = path.join(__dirname, '..', 'fixtures', 'navigator')
        targetDir = path.join(gopath, 'src', 'godeftest')
        fs.copySync(sourceDir, targetDir)
      })

      waitsForPromise(() => {
        return atom.workspace.open(path.join(targetDir, 'foo.go')).then((e) => {
          editor = e
        })
      })
    })

    describe('when using the godef navigator mode', () => {
      beforeEach(() => {
        atom.config.set('go-plus.navigator.mode', 'godef')
      })

      it('navigates to the correct location', () => {
        runs(() => {
          editor.setCursorBufferPosition([3, 17])
        })

        waitsForPromise(() => {
          return godef.gotoDefinitionForWordAtCursor()
        })

        runs(() => {
          const activeEditor = atom.workspace.getActiveTextEditor()
          expect(activeEditor.getTitle()).toBe('bar.go')

          const pos = activeEditor.getCursorBufferPosition()
          expect(pos.row).toBe(2)
          expect(pos.column).toBe(5)

          expect(godef.navigationStack.isEmpty()).toBe(false)
        })
      })
    })

    describe('when using the guru navigator mode', () => {
      beforeEach(() => {
        atom.config.set('go-plus.navigator.mode', 'godef')
      })

      it('navigates to the correct location', () => {
        runs(() => {
          editor.setCursorBufferPosition([3, 17])
        })

        waitsForPromise(() => {
          return godef.gotoDefinitionForWordAtCursor()
        })

        runs(() => {
          const activeEditor = atom.workspace.getActiveTextEditor()
          expect(activeEditor.getTitle()).toBe('bar.go')

          const pos = activeEditor.getCursorBufferPosition()
          expect(pos.row).toBe(2)
          expect(pos.column).toBe(5)

          expect(godef.navigationStack.isEmpty()).toBe(false)
        })
      })
    })
  })
})
