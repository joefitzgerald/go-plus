'use babel'
/* eslint-env jasmine */

import temp from 'temp'
import path from 'path'
import fs from 'fs-plus'

describe('gorename', () => {
  temp.track()
  let mainModule = null
  let gorename = null
  let editor = null
  let gopath = null
  let oldGopath = null
  let source = null
  let target = null

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
      mainModule = pack.mainModule
      mainModule.getGoconfig()
      mainModule.getGoget()
      mainModule.loadGorename()
    })

    waitsFor(() => {
      gorename = mainModule.gorename
      return gorename
    })
  })

  afterEach(() => {
    if (oldGopath) {
      process.env.GOPATH = oldGopath
    } else {
      delete process.env.GOPATH
    }
  })

  describe('when a simple file is open', () => {
    beforeEach(() => {
      runs(() => {
        source = path.join(__dirname, '..', 'fixtures', 'gorename')
        target = path.join(gopath, 'src', 'basic')
        fs.copySync(source, target)
      })

      waitsForPromise(() => {
        return atom.workspace.open(path.join(target, 'main.go')).then((e) => {
          editor = e
          return
        })
      })
    })

    it('renames a single token', () => {
      editor.setCursorBufferPosition([4, 5])
      let info = gorename.wordAndOffset(editor)
      expect(info.word).toBe('foo')
      expect(info.offset).toBe(33)

      let file = editor.getBuffer().getPath()
      let cwd = path.dirname(file)
      let r = false
      let cmd
      waitsForPromise(() => {
        return mainModule.getGoconfig().locator.findTool('gorename').then((c) => {
          expect(c).toBeTruthy()
          cmd = c
        })
      })
      waitsForPromise(() => {
        return gorename.runGorename(file, info.offset, cwd, 'bar', cmd).then((result) => {
          r = result
          return
        })
      })
      runs(() => {
        expect(r).toBeTruthy()
        expect(r.success).toBe(true)
        expect(r.result.stdout.trim()).toBe('Renamed 2 occurrences in 1 file in 1 package.')
        let expected = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'gorename', 'expected'), 'utf8')
        let actual = editor.getText()
        expect(actual).toBe(expected)
      })
    })
  })
})
