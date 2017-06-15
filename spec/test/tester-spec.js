'use babel'
/* eslint-env jasmine */

import path from 'path'
import fs from 'fs-extra'
import {lifecycle} from './../spec-helpers'

describe('tester', () => {
  let gopath = null
  let tester = null

  beforeEach(() => {
    runs(() => {
      lifecycle.setup()

      atom.config.set('go-plus.format.formatOnSave', false)
      atom.config.set('go-plus.test.coverageHighlightMode', 'covered-and-uncovered')
      gopath = lifecycle.temp.mkdirSync()
      process.env.GOPATH = gopath
      atom.project.setPaths([gopath])
    })

    waitsForPromise(() => {
      return lifecycle.activatePackage()
    })

    runs(() => {
      const { mainModule } = lifecycle
      mainModule.loadTester()
      tester = mainModule.tester
    })

    waitsFor(() => {
      return lifecycle.mainModule.provideGoConfig() !== false
    })
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  describe('when run coverage on save is disabled', () => {
    let filePath
    let testFilePath
    let editor
    let testEditor

    beforeEach(() => {
      atom.config.set('go-plus.test.runTestsOnSave', false)
      filePath = path.join(gopath, 'src', 'github.com', 'testuser', 'example', 'go-plus.go')
      testFilePath = path.join(gopath, 'src', 'github.com', 'testuser', 'example', 'go-plus_test.go')
      fs.ensureDirSync(path.dirname(filePath))
      fs.ensureDirSync(path.dirname(testFilePath))
      fs.writeFileSync(filePath, '')
      fs.writeFileSync(testFilePath, '')
      waitsForPromise(() => {
        return atom.workspace.open(filePath).then((e) => {
          editor = e
        })
      })

      waitsForPromise(() => {
        return atom.workspace.open(testFilePath).then((e) => {
          testEditor = e
        })
      })
    })

    it('displays coverage for go source', () => {
      let buffer
      let testBuffer

      runs(() => {
        buffer = editor.getBuffer()
        buffer.setText('package main\n\nimport "fmt"\n\nfunc main()  {\n\tfmt.Println(Hello())\n}\n\nfunc Hello() string {\n\treturn "Hello, 世界"\n}\n')
        testBuffer = testEditor.getBuffer()
        testBuffer.setText('package main\n\nimport "testing"\n\nfunc TestHello(t *testing.T) {\n\tresult := Hello()\n\tif result != "Hello, 世界" {\n\t\tt.Errorf("Expected %s - got %s", "Hello, 世界", result)\n\t}\n}')
      })

      waitsForPromise(() => {
        return Promise.all([
          buffer.save(),
          testBuffer.save()
        ])
      })

      waitsForPromise(() => { return tester.runTests(editor) })

      runs(() => {
        const layers = tester.markedEditors.get(editor.id)
        expect(layers).toBeTruthy()
        let layerids = layers.split(',')
        let coveredLayer = editor.getMarkerLayer(layerids[0])
        let uncoveredLayer = editor.getMarkerLayer(layerids[1])
        expect(coveredLayer).toBeTruthy()
        expect(uncoveredLayer).toBeTruthy()

        let coveredmarkers = coveredLayer.getMarkers()
        expect(coveredmarkers).toBeDefined()
        expect(coveredmarkers.length).toBe(1)
        expect(coveredmarkers[0]).toBeDefined()
        let range = coveredmarkers[0].getBufferRange()
        expect(range.start.row).toBe(8)
        expect(range.start.column).toBe(20)
        expect(range.end.row).toBe(10)
        expect(range.end.column).toBe(1)

        let uncoveredmarkers = uncoveredLayer.getMarkers()
        expect(uncoveredmarkers).toBeDefined()
        expect(uncoveredmarkers.length).toBe(1)
        expect(uncoveredmarkers[0]).toBeDefined()
        range = uncoveredmarkers[0].getBufferRange()
        expect(range).toBeDefined()
        expect(range.start.row).toBe(4)
        expect(range.start.column).toBe(13)
        expect(range.end.row).toBe(6)
        expect(range.end.column).toBe(1)
      })
    })

    it('clears coverage for go source', () => {
      let buffer
      let testBuffer

      runs(() => {
        buffer = editor.getBuffer()
        buffer.setText('package main\n\nimport "fmt"\n\nfunc main()  {\n\tfmt.Println(Hello())\n}\n\nfunc Hello() string {\n\treturn "Hello, 世界"\n}\n')
        testBuffer = testEditor.getBuffer()
        testBuffer.setText('package main\n\nimport "testing"\n\nfunc TestHello(t *testing.T) {\n\tresult := Hello()\n\tif result != "Hello, 世界" {\n\t\tt.Errorf("Expected %s - got %s", "Hello, 世界", result)\n\t}\n}')
      })

      waitsForPromise(() => {
        return Promise.all([
          buffer.save(),
          testBuffer.save()
        ])
      })

      waitsForPromise(() => { return tester.runTests(editor) })

      runs(() => {
        let layerids = tester.markedEditors.get(editor.id).split(',')
        let coveredLayer = editor.getMarkerLayer(layerids[0])
        let uncoveredLayer = editor.getMarkerLayer(layerids[1])
        expect(coveredLayer).toBeTruthy()
        expect(uncoveredLayer).toBeTruthy()

        let coveredmarkers = coveredLayer.getMarkers()
        expect(coveredmarkers).toBeDefined()
        expect(coveredmarkers.length).toBe(1)
        expect(coveredmarkers[0]).toBeDefined()
        let range = coveredmarkers[0].getBufferRange()
        expect(range.start.row).toBe(8)
        expect(range.start.column).toBe(20)
        expect(range.end.row).toBe(10)
        expect(range.end.column).toBe(1)

        let uncoveredmarkers = uncoveredLayer.getMarkers()
        expect(uncoveredmarkers).toBeDefined()
        expect(uncoveredmarkers.length).toBe(1)
        expect(uncoveredmarkers[0]).toBeDefined()
        range = uncoveredmarkers[0].getBufferRange()
        expect(range).toBeDefined()
        expect(range.start.row).toBe(4)
        expect(range.start.column).toBe(13)
        expect(range.end.row).toBe(6)
        expect(range.end.column).toBe(1)

        tester.clearMarkers(editor)
        expect(coveredLayer.getMarkers().length).toBe(0)
        expect(uncoveredLayer.getMarkers().length).toBe(0)
      })
    })
  })
})
