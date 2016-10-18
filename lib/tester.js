'use babel'

import {CompositeDisposable} from 'atom'
import _ from 'lodash'
import fs from 'fs'
import os from 'os'
import parser from './gocover-parser'
import path from 'path'
import rimraf from 'rimraf'
import temp from 'temp'

class Tester {
  constructor (goconfigFunc, gogetFunc, testPanelManagerFunc) {
    this.goget = gogetFunc
    this.goconfig = goconfigFunc
    this.testPanelManager = testPanelManagerFunc
    this.subscriptions = new CompositeDisposable()
    this.saveSubscriptions = new CompositeDisposable()
    this.observeConfig()
    this.observeTextEditors()
    this.handleCommands()
    this.markedEditors = new Map()
    this.running = false
    temp.track()
  }

  dispose () {
    this.running = true
    this.removeTempDir()
    this.clearMarkersFromEditors()
    if (this.markedEditors) {
      this.markedEditors.clear()
    }
    this.markedEditors = null
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    if (this.saveSubscriptions) {
      this.saveSubscriptions.dispose()
    }
    this.saveSubscriptions = null
    this.goget = null
    this.goconfig = null
    this.testPanelManager = null
    this.running = null
  }

  handleCommands () {
    this.subscriptions.add(atom.commands.add('atom-workspace', 'golang:run-tests', () => {
      if (!this.ready() || !this.getEditor()) {
        return
      }
      this.runTests()
    }))
    this.subscriptions.add(atom.commands.add('atom-workspace', 'golang:hide-coverage', () => {
      if (!this.ready() || !this.getEditor()) {
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
    this.subscriptions.add(atom.config.observe('tester-go.runTestsOnSave', (runTestsOnSave) => {
      if (this.saveSubscriptions) {
        this.saveSubscriptions.dispose()
      }
      this.saveSubscriptions = new CompositeDisposable()
      if (runTestsOnSave) {
        this.subscribeToSaveEvents()
      }
    }))
    this.subscriptions.add(atom.config.observe('tester-go.coverageHighlightMode', (coverageHighlightMode) => {
      this.coverageHighlightMode = coverageHighlightMode
    }))
  }

  subscribeToSaveEvents () {
    this.saveSubscriptions.add(atom.workspace.observeTextEditors((editor) => {
      if (!editor || !editor.getBuffer()) {
        return
      }

      let bufferSubscriptions = new CompositeDisposable()
      bufferSubscriptions.add(editor.getBuffer().onDidSave((filePath) => {
        if (atom.config.get('tester-go.runTestsOnSave')) {
          this.runTests(editor)
          return
        }
      }))
      bufferSubscriptions.add(editor.getBuffer().onDidDestroy(() => {
        bufferSubscriptions.dispose()
      }))
      this.saveSubscriptions.add(bufferSubscriptions)
    }))
  }

  getEditor () {
    if (!atom || !atom.workspace) {
      return
    }
    let editor = atom.workspace.getActiveTextEditor()
    if (!this.isValidEditor(editor)) {
      return
    }

    return editor
  }

  isValidEditor (editor) {
    if (!editor || !editor.getGrammar()) {
      return false
    }

    return editor.getGrammar().scopeName === 'source.go'
  }

  addMarkersToEditors () {
    let editors = atom.workspace.getTextEditors()
    for (let editor of editors) {
      this.addMarkersToEditor(editor)
    }
  }

  clearMarkersFromEditors () {
    let editors = atom.workspace.getTextEditors()
    for (let editor of editors) {
      this.clearMarkers(editor)
    }
  }

  addMarkersToEditor (editor) {
    if (!this.isValidEditor(editor)) {
      return
    }
    let file = editor.getPath()
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

    let editorRanges = _.filter(this.ranges, (r) => { return _.endsWith(file, r.file) })

    if (!editorRanges || editorRanges.length <= 0) {
      return
    }

    try {
      let coveredLayer = editor.addMarkerLayer()
      let uncoveredLayer = editor.addMarkerLayer()
      this.markedEditors.set(editor.id, coveredLayer.id + ',' + uncoveredLayer.id)
      for (let range of editorRanges) {
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
      editor.decorateMarkerLayer(coveredLayer, {type: 'highlight', class: 'covered', onlyNonEmpty: true})
      editor.decorateMarkerLayer(uncoveredLayer, {type: 'highlight', class: 'uncovered', onlyNonEmpty: true})
    } catch (e) {
      console.log(e)
    }
  }

  clearMarkers (editor) {
    if (!editor || !editor.id || !editor.getBuffer() || !this.markedEditors) {
      return
    }

    if (!this.markedEditors.has(editor.id)) {
      return
    }

    try {
      let layersid = this.markedEditors.get(editor.id)
      if (!layersid) {
        return
      }

      for (let layerid of layersid.split(',')) {
        let layer = editor.getMarkerLayer(layerid)
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
      rimraf(this.tempDir, (e) => {
        if (e) {
          if (e.handle) {
            e.handle()
          }
          console.log(e)
        }
      })
      this.tempDir = null
    }
  }

  createCoverageFile () {
    this.removeTempDir()
    if (!this.tempDir) {
      this.tempDir = fs.realpathSync(temp.mkdirSync())
    }
    this.coverageFile = path.join(this.tempDir, 'coverage.out')
  }

  projectPath (editor) {
    if (editor && editor.getPath()) {
      return editor.getPath()
    }

    if (atom.project.getPaths().length) {
      return atom.project.getPaths()[0]
    }

    return false
  }

  getLocatorOptions (editor = this.getEditor()) {
    let options = {}
    let p = this.projectPath(editor)
    if (p) {
      options.directory = p
    }

    return options
  }

  getExecutorOptions (editor = this.getEditor()) {
    let o = this.getLocatorOptions(editor)
    let options = {}
    options.cwd = path.dirname(editor.getPath())
    let config = this.goconfig()
    if (config) {
      options.env = config.environment(o)
    }
    if (!options.env) {
      options.env = process.env
    }
    return options
  }

  ready () {
    return this.goconfig && this.goconfig()
  }

  runTests (editor = this.getEditor()) {
    if (!this.isValidEditor(editor)) {
      return Promise.resolve()
    }
    let buffer = editor.getBuffer()
    if (!buffer) {
      return Promise.resolve()
    }
    if (this.running) {
      return Promise.resolve()
    }

    return Promise.resolve().then(() => {
      this.running = true
      this.clearMarkersFromEditors()
      this.createCoverageFile()
      let config = this.goconfig()
      let go = false
      let cover = false
      let locatorOptions = this.getLocatorOptions(editor)
      return config.locator.findTool('go', locatorOptions).then((cmd) => {
        if (!cmd) {
          return false
        }
        go = cmd
        return config.locator.findTool('cover', locatorOptions)
      }).then((cmd) => {
        if (!cmd) {
          return false
        }
        cover = cmd
      }).then(() => {
        if (!go || !cover) {
          this.running = false
          return
        }

        let cmd = go
        let args = ['test', '-coverprofile=' + this.coverageFile]
        if (atom.config.get('tester-go.runTestsWithShortFlag')) {
          args.push('-short')
        }
        let executorOptions = this.getExecutorOptions(editor)
        this.testPanelManager().update({output: 'Running go ' + args.join(' '), state: 'pending', exitcode: 0})
        return config.executor.exec(cmd, args, executorOptions).then((r) => {
          if (r.stderr && r.stderr.trim() !== '') {
            let output = r.stderr + os.EOL + r.stdout
            this.testPanelManager().update({exitcode: r.exitcode, output: output.trim(), state: 'fail'})
          }

          if (r.exitcode === 0) {
            this.ranges = parser.ranges(this.coverageFile)
            this.addMarkersToEditors()
            this.testPanelManager().update({exitcode: r.exitcode, output: r.stdout, state: 'success'})
          } else {
            this.testPanelManager().update({exitcode: r.exitcode, output: r.stdout, state: 'fail'})
          }

          this.running = false
        })
      }).catch((e) => {
        if (e.handle) {
          e.handle()
        }
        console.log(e)
        this.running = false
        return Promise.resolve()
      })
    })
  }
}
export {Tester}
