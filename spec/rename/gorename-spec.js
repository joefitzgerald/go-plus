'use babel'
/* eslint-env jasmine */

import path from 'path'
import fs from 'fs-extra'
import {lifecycle} from './../spec-helpers'

describe('gorename', () => {
  let gorename = null
  let editor = null
  let gopath = null
  let source = null
  let target = null

  beforeEach(() => {
    runs(() => {
      lifecycle.setup()

      gopath = fs.realpathSync(lifecycle.temp.mkdirSync('gopath-'))
      process.env.GOPATH = gopath
    })

    waitsForPromise(() => {
      return lifecycle.activatePackage()
    })

    runs(() => {
      const { mainModule } = lifecycle
      mainModule.provideGoConfig()
      mainModule.provideGoGet()
      mainModule.loadGorename()
    })

    waitsFor(() => {
      gorename = lifecycle.mainModule.gorename
      return gorename
    })
  })

  afterEach(() => {
    lifecycle.teardown()
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

      waitsFor(() => {
        if (lifecycle.mainModule.provideGoConfig()) {
          return true
        }
        return false
      }, '', 750)

      waitsForPromise(() => {
        return lifecycle.mainModule.provideGoConfig().locator.findTool('gorename').then((c) => {
          expect(c).toBeTruthy()
          cmd = c
        })
      })
      waitsForPromise(() => {
        return gorename.runGorename(file, info.offset, cwd, 'bar', cmd).then((result) => {
          r = result
        })
      })
      runs(() => {
        expect(r).toBeTruthy()
        expect(r.success).toBe(true)
        expect(r.result.stdout.trim()).toBe('Renamed 2 occurrences in 1 file in 1 package.')
        editor.destroy()
      })

      waitsForPromise(() => {
        return atom.workspace.open(path.join(target, 'main.go')).then((e) => {
          editor = e
        })
      })

      runs(() => {
        let expected = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'gorename', 'expected'), 'utf8')
        let actual = editor.getText()
        expect(actual).toBe(expected)
      })
    })
  })
})
