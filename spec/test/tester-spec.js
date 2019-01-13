'use babel'
/* eslint-env jasmine */

import path from 'path'
import { lifecycle } from './../spec-helpers'
import { it, fit, ffit, beforeEach, runs } from '../async-spec-helpers' // eslint-disable-line

describe('tester', () => {
  let tester = null

  beforeEach(async () => {
    lifecycle.setup()
    atom.config.set(
      'go-plus.test.coverageHighlightMode',
      'covered-and-uncovered'
    )
    await lifecycle.activatePackage()
    const { mainModule } = lifecycle
    tester = mainModule.loadTester()
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  describe('go test args', () => {
    beforeEach(() => {
      atom.config.unset('go-plus.config.additionalTestArgs')
    })

    afterEach(() => {
      atom.config.set('go-plus.test.runTestsWithShortFlag', true)
      atom.config.set('go-plus.test.runTestsWithVerboseFlag', false)
    })

    it('uses the specified timeout', () => {
      const args = tester.buildGoTestArgs(10000, false)
      let foundTimeout = false
      for (const arg of args) {
        if (arg.startsWith('-timeout')) {
          foundTimeout = true
          expect(arg).toBe('-timeout=10000ms')
        }
      }
      expect(foundTimeout).toBe(true)
    })

    it('invokes the go test command with a coverprofile', () => {
      const args = tester.buildGoTestArgs(10000, true)
      expect(args[0]).toBe('test')
      expect(args[1].startsWith('-coverprofile=')).toBe(true)
    })

    describe('when specifying custom args', () => {
      it('prefers timeout from the custom args (if specified)', () => {
        atom.config.set('go-plus.config.additionalTestArgs', '-timeout=4000ms')
        const args = tester.buildGoTestArgs(8000, false)
        let foundTimeout = false
        for (const arg of args) {
          if (arg.startsWith('-timeout')) {
            foundTimeout = true
            expect(arg).toBe('-timeout=4000ms')
          }
        }
        expect(foundTimeout).toBe(true)
      })

      it('does not duplicate the -short or -verbose flags', () => {
        atom.config.set('go-plus.test.runTestsWithShortFlag', true)
        atom.config.set('go-plus.test.runTestsWithVerboseFlag', true)
        atom.config.set('go-plus.config.additionalTestArgs', '-short -verbose')

        const args = tester.buildGoTestArgs()
        const shortFlags = args.filter(a => a === '-short').length
        const verboseFlags = args.filter(a => a === '-v').length

        expect(shortFlags).toBe(1)
        expect(verboseFlags).toBe(1)
      })

      it('handles args with spaces', () => {
        atom.config.set(
          'go-plus.config.additionalTestArgs',
          '-myarg="hello world"  -arg2   3'
        )
        const args = tester.buildGoTestArgs()
        expect(args.length).toBeGreaterThan(3)
        expect(args[1]).toEqual('-myarg=hello world')
        expect(args[2]).toEqual('-arg2')
        expect(args[3]).toEqual('3')
      })
    })
  })

  describe('with a gopath setup', () => {
    let gopath = null
    let filePath
    let editor

    beforeEach(async () => {
      gopath = path.join(__dirname, '..', 'fixtures', 'test')
      process.env.GOPATH = gopath
      atom.project.setPaths([gopath])

      filePath = path.join(
        gopath,
        'src',
        'github.com',
        'testuser',
        'example',
        'go-plus.go'
      )

      editor = await atom.workspace.open(filePath)
    })

    describe('when run tests on save is enabled, but compile on save is disabled', () => {
      beforeEach(() => {
        atom.config.set('go-plus.config.compileOnSave', false)
        atom.config.set('go-plus.test.runTestsOnSave', true)
        atom.config.set('go-plus.test.runTestsWithCoverage', false)
      })

      it('runs tests', async () => {
        spyOn(tester, 'runTests').andCallThrough()
        await tester.handleSaveEvent(editor)
        expect(tester.runTests).toHaveBeenCalled()
      })

      it('updates the busy signal', async () => {
        const fake = (title, promiseFunc) => promiseFunc()
        const reportBusySpy = jasmine
          .createSpy('reportBusyWhile')
          .andCallFake(fake)
        spyOn(tester, 'busySignal').andReturn({
          reportBusyWhile: reportBusySpy
        })
        await tester.handleSaveEvent(editor)
        expect(reportBusySpy.calls.length).toEqual(1)
      })
    })

    describe('when run tests on save is disabled', () => {
      beforeEach(() => {
        atom.config.set('go-plus.test.runTestsOnSave', false)
      })

      it('does not run tests automatically on save', async () => {
        spyOn(tester, 'runTests')
        await tester.handleSaveEvent(editor)
        expect(tester.runTests).not.toHaveBeenCalled()
      })

      it('displays coverage for go source', async () => {
        await tester.runTests(editor)

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
        expect(range.start.column).toBe(12)
        expect(range.end.row).toBe(6)
        expect(range.end.column).toBe(1)
      })

      it('clears coverage for go source', async () => {
        await tester.runTests(editor)

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
        expect(range.start.column).toBe(12)
        expect(range.end.row).toBe(6)
        expect(range.end.column).toBe(1)

        tester.clearMarkers(editor)
        expect(coveredLayer.getMarkers().length).toBe(0)
        expect(uncoveredLayer.getMarkers().length).toBe(0)
      })
    })
  })
})
