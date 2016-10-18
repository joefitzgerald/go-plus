'use babel'
/* eslint-env jasmine */

import path from 'path'
import temp from 'temp'
import fs from 'fs-plus'

describe('tester', () => {
  let mainModule = null
  let gopath = null
  let oldGopath = null

  beforeEach(() => {
    runs(() => {
      if (process.env.GOPATH) {
        oldGopath = process.env.GOPATH
      }
      atom.config.set('tester-go.coverageHighlightMode', 'covered-and-uncovered')
      gopath = temp.mkdirSync()
      process.env.GOPATH = gopath
      atom.project.setPaths(gopath)
    })

    waitsForPromise(() => {
      return atom.packages.activatePackage('go-config').then(() => {
        return atom.packages.activatePackage('tester-go')
      }).then((pack) => {
        mainModule = pack.mainModule
        return atom.packages.activatePackage('language-go')
      })
    })

    waitsFor(() => {
      return mainModule.getGoconfig() !== false
    })
  })

  afterEach(() => {
    if (oldGopath) {
      process.env.GOPATH = oldGopath
    } else {
      delete process.env.GOPATH
    }
  })

  describe('when run coverage on save is disabled', () => {
    let filePath
    let testFilePath
    let editor
    let testEditor

    beforeEach(() => {
      atom.config.set('tester-go.runTestsOnSave', false)
      filePath = path.join(gopath, 'src', 'github.com', 'testuser', 'example', 'go-plus.go')
      testFilePath = path.join(gopath, 'src', 'github.com', 'testuser', 'example', 'go-plus_test.go')
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
      let buffer = editor.getBuffer()
      buffer.setText('package main\n\nimport "fmt"\n\nfunc main()  {\n\tfmt.Println(Hello())\n}\n\nfunc Hello() string {\n\treturn "Hello, 世界"\n}\n')
      buffer.save()
      let testBuffer = testEditor.getBuffer()
      testBuffer.setText('package main\n\nimport "testing"\n\nfunc TestHello(t *testing.T) {\n\tresult := Hello()\n\tif result != "Hello, 世界" {\n\t\tt.Errorf("Expected %s - got %s", "Hello, 世界", result)\n\t}\n}')
      testBuffer.save()
      let p = mainModule.getTester().runTests(editor)

      waitsForPromise(() => { return p })

      runs(() => {
        let layerids = mainModule.getTester().markedEditors.get(editor.id).split(',')
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

      p = mainModule.getTester().runTests(editor)

      waitsForPromise(() => { return p })

      runs(() => {
        let layerids = mainModule.getTester().markedEditors.get(editor.id).split(',')
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

      expect(mainModule).toBeDefined()
      expect(mainModule).toBeTruthy()
      expect(mainModule.getGoconfig).toBeDefined()
      expect(mainModule.consumeGoconfig).toBeDefined()
      expect(mainModule.getGoconfig()).toBeTruthy()
      expect(mainModule.tester).toBeDefined()
      expect(mainModule.tester).toBeTruthy()
    })

    it('clears coverage for go source', () => {
      let buffer = editor.getBuffer()
      buffer.setText('package main\n\nimport "fmt"\n\nfunc main()  {\n\tfmt.Println(Hello())\n}\n\nfunc Hello() string {\n\treturn "Hello, 世界"\n}\n')
      buffer.save()
      let testBuffer = testEditor.getBuffer()
      testBuffer.setText('package main\n\nimport "testing"\n\nfunc TestHello(t *testing.T) {\n\tresult := Hello()\n\tif result != "Hello, 世界" {\n\t\tt.Errorf("Expected %s - got %s", "Hello, 世界", result)\n\t}\n}')
      testBuffer.save()
      let p = mainModule.getTester().runTests(editor)

      waitsForPromise(() => { return p })

      runs(() => {
        let layerids = mainModule.getTester().markedEditors.get(editor.id).split(',')
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

        mainModule.getTester().clearMarkers(editor)
        expect(coveredLayer.getMarkers().length).toBe(0)
        expect(uncoveredLayer.getMarkers().length).toBe(0)
      })
    })
  })
})
