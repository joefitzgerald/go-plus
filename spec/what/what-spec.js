'use babel'
/* eslint-env jasmine */

import fs from 'fs-extra'
import path from 'path'
import {lifecycle} from './../spec-helpers'

describe('what', () => {
  let what

  beforeEach(() => {
    runs(() => {
      lifecycle.setup()
    })

    waitsForPromise(() => {
      return lifecycle.activatePackage()
    })

    runs(() => {
      const {mainModule} = lifecycle
      mainModule.provideGoConfig()
      mainModule.loadWhat()
    })

    waitsFor(() => {
      what = lifecycle.mainModule.what
      return what
    })
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  it('monitors the config', () => {
    atom.config.set('go-plus.guru.highlightIdentifiers', false)
    expect(what.shouldDecorate).toBe(false)
    atom.config.set('go-plus.guru.highlightIdentifiers', true)
    expect(what.shouldDecorate).toBe(true)
    atom.config.set('go-plus.guru.highlightIdentifiers', false)
    expect(what.shouldDecorate).toBe(false)
  })

  describe('when run on a valid go file', () => {
    let editor = null
    let gopath = null
    let source = null
    let target = null

    beforeEach(() => {
      runs(() => {
        gopath = fs.realpathSync(lifecycle.temp.mkdirSync('gopath-'))
        process.env.GOPATH = gopath

        source = path.join(__dirname, '..', 'fixtures')
        target = path.join(gopath, 'src', 'what')
        fs.copySync(source, target)

        // we'll manually invoke guru for easier testing
        atom.config.set('go-plus.guru.highlightIdentifiers', false)
      })

      waitsForPromise(() => {
        return atom.workspace.open(path.join(target, 'doc.go')).then((e) => {
          editor = e
        })
      })
    })

    it('highlights identifiers', () => {
      runs(() => {
        editor.setCursorBufferPosition([22, 1])
      })

      waitsForPromise(() => {
        return what.run(editor, editor.getCursorBufferPosition(), editor.getCursors()[0], true)
      })

      runs(() => {
        expect(what.currentEditorLayer).toBeTruthy()
        const markers = what.currentEditorLayer.getMarkers()
        expect(markers.length).toBe(3)
        expect(markers[0].getBufferRange().start.row).toBe(22)
        expect(markers[1].getBufferRange().start.row).toBe(23)
        expect(markers[2].getBufferRange().start.row).toBe(24)
      })
    })
  })
})
