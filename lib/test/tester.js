// @flow
'use babel'

import {CompositeDisposable} from 'atom'
import _ from 'lodash'
import fs from 'fs-extra'
import os from 'os'
import parser from './gocover-parser'
import path from 'path'
import temp from 'temp'
import {getEditor, isValidEditor} from '../utils'

import type {GoConfig} from './../config/service'
import type {CoverageRange} from './gocover-parser'
import type OutputManager from './../output-manager'

class Tester {
  disposed: bool
  running: bool
  goconfig: GoConfig
  output: OutputManager
  subscriptions: CompositeDisposable
  markedEditors: Map<string, string>
  coverageHighlightMode: 'covered-and-uncovered' | 'covered' | 'uncovered' | 'disabled'
  coverageDisplayMode: 'highlight' | 'gutter'
  tempDir: string
  coverageFile: string
  ranges: Array<CoverageRange>

  constructor (goconfig: GoConfig, output: OutputManager) {
    this.disposed = false
    this.goconfig = goconfig
    this.output = output
    this.subscriptions = new CompositeDisposable()
    this.observeConfig()
    this.observeTextEditors()
    this.handleCommands()
    this.markedEditors = new Map()
    this.running = false
    temp.track()
  }

  dispose () {
    this.disposed = true
    this.running = true
    this.removeTempDir()
    this.clearMarkersFromEditors()
    if (this.markedEditors) {
      this.markedEditors.clear()
    }
    this.markedEditors.clear()
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
  }

  handleCommands () {
    this.subscriptions.add(atom.commands.add('atom-workspace', 'golang:toggle-test-with-coverage', () => {
      atom.config.set('go-plus.test.runTestsWithCoverage', !atom.config.get('go-plus.test.runTestsWithCoverage'))
    }))
    this.subscriptions.add(atom.commands.add('atom-workspace', 'golang:run-tests', () => {
      if (!getEditor()) {
        return
      }
      this.runTests()
    }))
    this.subscriptions.add(atom.commands.add('atom-workspace', 'golang:hide-coverage', () => {
      if (!getEditor()) {
        return
      }
      this.clearMarkersFromEditors()
    }))
  }

  observeTextEditors () {
    this.subscriptions.add(atom.workspace.observeTextEditors((editor) => {
      this.addMarkersToEditor(editor)
    }))
  }

  observeConfig () {
    this.subscriptions.add(atom.config.observe('go-plus.test.coverageHighlightMode', (coverageHighlightMode) => {
      this.coverageHighlightMode = coverageHighlightMode
    }))
    this.subscriptions.add(atom.config.observe('go-plus.test.coverageDisplayMode', (coverageDisplayMode) => {
      this.coverageDisplayMode = coverageDisplayMode
    }))
  }

  handleSaveEvent (editor: any, path: string): Promise<void> {
    if (atom.config.get('go-plus.test.runTestsOnSave')) {
      return this.runTests(editor)
    }
    return Promise.resolve()
  }

  addMarkersToEditors () {
    const editors = atom.workspace.getTextEditors()
    for (const editor of editors) {
      this.addMarkersToEditor(editor)
    }
  }

  clearMarkersFromEditors () {
    const editors = atom.workspace.getTextEditors()
    for (const editor of editors) {
      this.clearMarkers(editor)
    }
  }

  addMarkersToEditor (editor: any) {
    if (!isValidEditor(editor)) {
      return
    }
    const file = editor.getPath()
    if (!editor.id) {
      return
    }

    if (!file) {
      return
    }
    this.clearMarkers(editor)
    if (!this.ranges || this.ranges.length <= 0) {
      return
    }
    if (this.coverageHighlightMode === 'disabled') {
      return
    }

    const re = /[^/\\]+$/g
    const editorRanges = _.filter(this.ranges, (r) => {
      return file.match(re)[0] === r.file.match(re)[0]
    })

    if (!editorRanges || editorRanges.length <= 0) {
      return
    }

    try {
      const coveredLayer = editor.addMarkerLayer()
      const uncoveredLayer = editor.addMarkerLayer()
      this.markedEditors.set(editor.id, coveredLayer.id + ',' + uncoveredLayer.id)
      for (const range of editorRanges) {
        if (range.count > 0) {
          if (this.coverageHighlightMode === 'covered-and-uncovered' || this.coverageHighlightMode === 'covered') {
            coveredLayer.markBufferRange(range.range, {invalidate: 'touch'})
          }
        } else {
          if (this.coverageHighlightMode === 'covered-and-uncovered' || this.coverageHighlightMode === 'uncovered') {
            uncoveredLayer.markBufferRange(range.range, {invalidate: 'touch'})
          }
        }
      }

      const type = (this.coverageDisplayMode === 'gutter') ? 'line-number' : 'highlight'
      editor.decorateMarkerLayer(coveredLayer, {type: type, class: 'covered', onlyNonEmpty: true})
      editor.decorateMarkerLayer(uncoveredLayer, {type: type, class: 'uncovered', onlyNonEmpty: true})
    } catch (e) {
      console.log(e)
    }
  }

  clearMarkers (editor: any) {
    if (!editor || !editor.id || !editor.getBuffer() || !this.markedEditors) {
      return
    }

    if (!this.markedEditors.has(editor.id)) {
      return
    }

    try {
      const layersid = this.markedEditors.get(editor.id)
      if (!layersid) {
        return
      }

      for (const layerid of layersid.split(',')) {
        const layer = editor.getMarkerLayer(layerid)
        if (layer) {
          layer.destroy()
        }
      }

      this.markedEditors.delete(editor.id)
    } catch (e) {
      console.log(e)
    }
  }

  removeTempDir () {
    if (this.tempDir) {
      fs.remove(this.tempDir, (e) => {
        if (e) {
          if (e.handle) {
            e.handle()
          }
          console.log(e)
        }
      })
      this.tempDir = ''
    }
  }

  createCoverageFile () {
    this.removeTempDir()
    if (!this.tempDir) {
      this.tempDir = fs.realpathSync(temp.mkdirSync())
    }
    this.coverageFile = path.join(this.tempDir, 'coverage.out')
  }

  runTests (editor: any = getEditor()): Promise<void> {
    if (!isValidEditor(editor)) {
      return Promise.reject(new Error('invalid editor'))
    }
    const buffer = editor.getBuffer()
    if (!buffer) {
      return Promise.reject(new Error('falsy buffer'))
    }
    if (this.running || !this.goconfig) {
      return Promise.resolve()
    }

    this.running = true
    const runTestsWithCoverage = atom.config.get('go-plus.test.runTestsWithCoverage')
    this.clearMarkersFromEditors()
    if (runTestsWithCoverage) {
      this.createCoverageFile()
    }
    let go = false
    let cover = false
    return this.goconfig.locator.findTool('go').then((cmd) => {
      if (!cmd) {
        return Promise.reject(new Error('cannot find go executable'))
      }
      go = cmd
      return this.goconfig.locator.findTool('cover')
    }).then((cmd) => {
      if (!cmd) {
        return Promise.reject(new Error('cannot find cover executable'))
      }
      cover = cmd
      return cmd
    }).then(() => {
      if (!go || !cover || this.disposed) {
        this.running = false
        return Promise.resolve()
      }
      const executorOptions = this.goconfig.executor.getOptions('file')
      const timeout = atom.config.get('go-plus.test.timeout') || 60000
      executorOptions.timeout = timeout

      const cmd = go
      const args = ['test', '-timeout=' + executorOptions.timeout + 'ms']
      if (runTestsWithCoverage) {
        args.push('-coverprofile=' + this.coverageFile)
      }
      if (atom.config.get('go-plus.test.runTestsWithShortFlag')) {
        args.push('-short')
      }
      if (atom.config.get('go-plus.test.runTestsWithVerboseFlag')) {
        args.push('-v')
      }
      if (this.output) {
        this.output.update({
          output: 'Running go ' + args.join(' ') + ' with a ' + timeout + 'ms timeout',
          state: 'pending',
          exitcode: 0,
          dir: executorOptions.cwd
        })
      }

      return this.goconfig.executor.exec(cmd, args, executorOptions).then((r) => {
        let output = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
        if (r.stderr) {
          const stderr = r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr
          output = stderr + os.EOL + output
        }

        output = output.trim()
        let state
        if (r.exitcode === 0) {
          state = 'success'
        } else if (r.exitcode === 124) {
          state = 'fail'
          output = output + os.EOL + 'Tests timed out after ' + atom.config.get('go-plus.test.timeout') + 'ms'
        } else {
          state = 'fail'
        }
        if (runTestsWithCoverage) {
          this.ranges = parser.ranges(this.coverageFile)
          this.addMarkersToEditors()
        }
        if (this.output) {
          this.output.update({
            exitcode: r.exitcode,
            output: output,
            state: state,
            dir: executorOptions.cwd
          })
        }
        this.running = false
        return r.exitcode === 0 ? Promise.resolve() : Promise.reject(new Error(output))
      })
    })
  }
}
export {Tester}
