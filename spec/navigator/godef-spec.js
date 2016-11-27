'use babel'
/* eslint-env jasmine */

import temp from 'temp'
import path from 'path'
import fs from 'fs-plus'

describe('godef', () => {
  temp.track()
  let godef = null
  let oldGopath = null
  let gopath = null

  beforeEach(() => {
    runs(() => {
      if (process.env.GOPATH) {
        oldGopath = process.env.GOPATH
      }
      gopath = fs.realpathSync(temp.mkdirSync('gopath-'))
      process.env.GOPATH = gopath
    })

    waitsForPromise(() => {
      return atom.packages.activatePackage('language-go')
    })

    runs(() => {
      let pack = atom.packages.loadPackage('go-plus')
      pack.activateNow()
      let mainModule = pack.mainModule
      mainModule.getGoconfig()
      mainModule.getGoget()
      godef = mainModule.getGodef()
    })
  })

  afterEach(() => {
    if (oldGopath) {
      process.env.GOPATH = oldGopath
    } else {
      delete process.env.GOPATH
    }
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

    it('navigates to the correct location', () => {
      runs(() => {
        editor.setCursorBufferPosition([3, 20])
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
