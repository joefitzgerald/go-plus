// @flow

import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import temp from '@atom/temp'
import argparser from 'yargs-parser/lib/tokenize-arg-string'
import { CompositeDisposable } from 'atom'
import * as gocover from './gocover-parser'
import { getEditor, isValidEditor } from '../utils'

import type { GoConfig } from './../config/service'
import type { CoverageRange } from './gocover-parser'
import type { OutputManager } from './../output-manager'
import type { TextEditor } from 'atom'

class Tester {
  disposed: boolean
  running: boolean
  goconfig: GoConfig
  output: OutputManager
  busySignal: () => ?BusySignalService
  subscriptions: CompositeDisposable
  markedEditors: Map<number, string>
  coverageHighlightMode:
    | 'covered-and-uncovered'
    | 'covered'
    | 'uncovered'
    | 'disabled'
  coverageDisplayMode: 'highlight' | 'gutter'
  tempDir: string
  coverageFile: string
  ranges: Array<CoverageRange>

  constructor(
    goconfig: GoConfig,
    output: OutputManager,
    busySignal: () => ?BusySignalService
  ) {
    this.disposed = false
    this.goconfig = goconfig
    this.output = output
    this.busySignal = busySignal
    this.subscriptions = new CompositeDisposable()
    this.observeConfig()
    this.observeTextEditors()
    this.handleCommands()
    this.markedEditors = new Map()
    this.running = false
    temp.track()
  }

  dispose() {
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
  }

  handleCommands() {
    this.subscriptions.add(
      atom.commands.add(
        'atom-workspace',
        'golang:toggle-test-with-coverage',
        () => {
          atom.config.set(
            'go-plus.test.runTestsWithCoverage',
            !atom.config.get('go-plus.test.runTestsWithCoverage')
          )
        }
      )
    )
    this.subscriptions.add(
      atom.commands.add('atom-workspace', 'golang:run-tests', () => {
        const editor = getEditor()
        if (!editor) {
          return
        }
        this.runTests(editor)
      })
    )
    this.subscriptions.add(
      atom.commands.add('atom-workspace', 'golang:hide-coverage', () => {
        if (!getEditor()) {
          return
        }
        this.clearMarkersFromEditors()
      })
    )
  }

  observeTextEditors() {
    this.subscriptions.add(
      atom.workspace.observeTextEditors(editor => {
        this.addMarkersToEditor(editor)
      })
    )
  }

  observeConfig() {
    this.subscriptions.add(
      atom.config.observe(
        'go-plus.test.coverageHighlightMode',
        coverageHighlightMode => {
          this.coverageHighlightMode = coverageHighlightMode
        }
      )
    )
    this.subscriptions.add(
      atom.config.observe(
        'go-plus.test.coverageDisplayMode',
        coverageDisplayMode => {
          this.coverageDisplayMode = coverageDisplayMode
        }
      )
    )
  }

  handleSaveEvent(editor: TextEditor): Promise<void> {
    if (atom.config.get('go-plus.test.runTestsOnSave')) {
      const bs = this.busySignal()
      const p = this.runTests(editor)
      return bs ? bs.reportBusyWhile('Testing Go', () => p) : p
    }
    return Promise.resolve()
  }

  addMarkersToEditors() {
    const editors = atom.workspace.getTextEditors()
    for (const editor of editors) {
      this.addMarkersToEditor(editor)
    }
  }

  clearMarkersFromEditors() {
    const editors = atom.workspace.getTextEditors()
    for (const editor of editors) {
      this.clearMarkers(editor)
    }
  }

  addMarkersToEditor(editor: TextEditor) {
    if (!isValidEditor(editor)) {
      return
    }
    const file = editor.getPath()
    if (!editor.hasOwnProperty('id')) {
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
    const fileMatch = (file.match(re) || [])[0]
    const editorRanges = this.ranges.filter(r => {
      const rangeFileMatches = r.file.match(re)
      return (
        rangeFileMatches &&
        rangeFileMatches.length > 0 &&
        fileMatch === rangeFileMatches[0]
      )
    })
    if (!editorRanges || editorRanges.length <= 0) {
      return
    }

    try {
      const coveredLayer = editor.addMarkerLayer()
      const uncoveredLayer = editor.addMarkerLayer()
      this.markedEditors.set(
        editor.id,
        coveredLayer.id + ',' + uncoveredLayer.id
      )
      for (const range of editorRanges) {
        if (range.count > 0) {
          if (
            this.coverageHighlightMode === 'covered-and-uncovered' ||
            this.coverageHighlightMode === 'covered'
          ) {
            coveredLayer.markBufferRange(range.range, { invalidate: 'touch' })
          }
        } else {
          if (
            this.coverageHighlightMode === 'covered-and-uncovered' ||
            this.coverageHighlightMode === 'uncovered'
          ) {
            uncoveredLayer.markBufferRange(range.range, { invalidate: 'touch' })
          }
        }
      }

      const type =
        this.coverageDisplayMode === 'gutter' ? 'line-number' : 'highlight'
      editor.decorateMarkerLayer(
        coveredLayer,
        ({
          type: type,
          class: 'covered',
          onlyNonEmpty: true
        }: any)
      )
      editor.decorateMarkerLayer(
        uncoveredLayer,
        ({
          type: type,
          class: 'uncovered',
          onlyNonEmpty: true
        }: any)
      )
    } catch (e) {
      console.log(e) // eslint-disable-line no-console
    }
  }

  clearMarkers(editor: TextEditor) {
    if (
      !editor ||
      !editor.hasOwnProperty('id') ||
      !editor.getBuffer() ||
      !this.markedEditors
    ) {
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
      console.log(e) // eslint-disable-line no-console
    }
  }

  removeTempDir() {
    if (this.tempDir) {
      fs.remove(this.tempDir, e => {
        if (e) {
          if (e.handle) {
            e.handle()
          }
          console.log(e) // eslint-disable-line no-console
        }
      })
      this.tempDir = ''
    }
  }

  createCoverageFile() {
    this.removeTempDir()
    if (!this.tempDir) {
      this.tempDir = fs.realpathSync(temp.mkdirSync())
    }
    this.coverageFile = path.join(this.tempDir, 'coverage.out')
  }

  buildGoTestArgs(
    timeoutMillis: number = 60000,
    coverage: boolean = false
  ): Array<string> {
    const args = ['test']
    if (coverage) {
      args.push('-coverprofile=' + this.coverageFile)
    }
    const configFlags = atom.config.get('go-plus.config.additionalTestArgs')

    let shortFlag = false
    let verboseFlag = false
    let userSuppliedTimeout = false

    if (configFlags && configFlags.length) {
      const arr = argparser(configFlags)

      for (const arg of arr) {
        args.push(arg)
        if (arg.startsWith('-timeout')) {
          userSuppliedTimeout = true
        }
        if (arg === '-short') {
          shortFlag = true
        }
        if (arg === '-v') {
          verboseFlag = true
        }
      }
    }

    if (!userSuppliedTimeout) {
      args.push('-timeout=' + timeoutMillis + 'ms')
    }

    if (!shortFlag && atom.config.get('go-plus.test.runTestsWithShortFlag')) {
      args.push('-short')
    }
    if (
      !verboseFlag &&
      atom.config.get('go-plus.test.runTestsWithVerboseFlag')
    ) {
      args.push('-v')
    }

    return args
  }

  async runTests(editor: TextEditor): Promise<void> {
    if (!isValidEditor(editor)) {
      throw new Error('invalid editor')
    }
    const buffer = editor.getBuffer()
    if (!buffer) {
      throw new Error('falsy buffer')
    }
    if (this.running || !this.goconfig || this.disposed) {
      return
    }

    this.running = true
    const runTestsWithCoverage = !!atom.config.get(
      'go-plus.test.runTestsWithCoverage'
    )
    this.clearMarkersFromEditors()
    if (runTestsWithCoverage) {
      this.createCoverageFile()
    }
    const [go, cover] = await Promise.all([
      this.goconfig.locator.findTool('go'),
      this.goconfig.locator.findTool('cover')
    ])
    if (!go) {
      throw new Error('cannot find go executable')
    }
    if (!cover) {
      throw new Error('cannot find cover executable')
    }

    const executorOptions = this.goconfig.executor.getOptions('file', editor)
    const t = atom.config.get('go-plus.test.timeout')
    const timeout = typeof t === 'number' ? t : 60000
    executorOptions.timeout = timeout

    const args = this.buildGoTestArgs(
      executorOptions.timeout,
      runTestsWithCoverage
    )
    if (this.output) {
      this.output.update({
        output:
          'Running go ' + args.join(' ') + ' with a ' + timeout + 'ms timeout',
        state: 'pending',
        exitcode: 0,
        dir: executorOptions.cwd
      })
    }

    const r = await this.goconfig.executor.exec(go, args, executorOptions)
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
      output = output + os.EOL + `Tests timed out after ${timeout} ms`
    } else {
      state = 'fail'
    }
    if (runTestsWithCoverage) {
      this.ranges = gocover.ranges(this.coverageFile)
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
    if (r.exitcode !== 0) {
      throw new Error(output)
    }
  }
}

export { Tester }
