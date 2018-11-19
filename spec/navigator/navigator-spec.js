'use babel'
/* eslint-env jasmine */

import path from 'path'
import fs from 'fs-extra'
import { lifecycle } from './../spec-helpers'
import { it, fit, ffit, beforeEach, runs } from '../async-spec-helpers' // eslint-disable-line

describe('go to definition', () => {
  let navigator = null
  let gopath = null

  beforeEach(async () => {
    lifecycle.setup()
    gopath = fs.realpathSync(lifecycle.temp.mkdirSync('gopath-'))
    process.env.GOPATH = gopath
    await lifecycle.activatePackage()
    const { mainModule } = lifecycle
    mainModule.provideGoConfig()
    mainModule.provideGoGet()
    navigator = mainModule.loadNavigator()
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  describe('when invoked on a valid project file', () => {
    let sourceDir
    let targetDir
    let editor

    beforeEach(async () => {
      sourceDir = path.join(__dirname, '..', 'fixtures', 'navigator')
      targetDir = path.join(gopath, 'src', 'godeftest')
      fs.copySync(sourceDir, targetDir)
      editor = await atom.workspace.open(path.join(targetDir, 'foo.go'))
    })

    describe('when using the godef navigator mode', () => {
      beforeEach(() => {
        atom.config.set('go-plus.navigator.mode', 'godef')
      })

      it('navigates to the correct location', async () => {
        editor.setCursorBufferPosition([3, 17])
        await navigator.gotoDefinitionForWordAtCursor()
        const activeEditor = atom.workspace.getActiveTextEditor()
        expect(activeEditor.getTitle()).toBe('bar.go')

        const pos = activeEditor.getCursorBufferPosition()
        expect(pos.row).toBe(2)
        expect(pos.column).toBe(5)
        expect(navigator.navigationStack.isEmpty()).toBe(false)
      })
    })

    describe('when using the guru navigator mode', () => {
      beforeEach(() => {
        atom.config.set('go-plus.navigator.mode', 'guru')
      })

      it('navigates to the correct location', async () => {
        editor.setCursorBufferPosition([3, 17]) // at the beginning of -> `Bar()`
        await navigator.gotoDefinitionForWordAtCursor()
        const activeEditor = atom.workspace.getActiveTextEditor()
        expect(activeEditor.getTitle()).toBe('bar.go')
        const pos = activeEditor.getCursorBufferPosition()
        expect(pos.row).toBe(2)
        expect(pos.column).toBe(5)
        expect(navigator.navigationStack.isEmpty()).toBe(false)
      })

      it('navigates to the correct location if at the end of a word', async () => {
        editor.setCursorBufferPosition([3, 20]) // at the end of `Bar()` <-
        await navigator.gotoDefinitionForWordAtCursor()

        const activeEditor = atom.workspace.getActiveTextEditor()
        expect(activeEditor.getTitle()).toBe('bar.go')

        const pos = activeEditor.getCursorBufferPosition()
        expect(pos.row).toBe(2)
        expect(pos.column).toBe(5)

        expect(navigator.navigationStack.isEmpty()).toBe(false)
      })
    })
  })
})
