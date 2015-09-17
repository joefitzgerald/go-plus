temp = require('temp').track()
fs = require('fs-plus')
path = require('path')
PathHelper = require('./util/pathhelper')
_ = require('underscore-plus')

describe 'go-plus atom-linter integration', ->
  goFile =   """
             package lintee

             func Broken() int {
               // Should return something
             }
             """

  testFile = """
             package lintee

             import "testing"

             func TestBroken(t *testing.T) {
               if got := Broken(); got != 1 {
                 t.Errorf("Broken() == %d, want 1", got)
               }
               brokenheretoo
             }
             """

  [goplus, lintProvider, gopath, sourceEditor, testEditor] = []

  beforeEach ->
    waitsForPromise ->
      atom.packages.activatePackage('language-go')
    waitsForPromise ->
      atom.packages.activatePackage('go-plus').then (g) ->
        goplus = g.mainModule
    runs ->
      lintProvider = goplus.provideLinter()

  PathHelper.createTempGopath (path) ->
    gopath = path

  createTestFiles = ->
    fs.writeFileSync(path.join(gopath, "src/lintee/lintee.go"), goFile)
    fs.writeFileSync(path.join(gopath, "src/lintee/lintee_test.go"), testFile)

  openTestFiles = ->
    waitsForPromise ->
      atom.workspace.open(path.join(gopath, "src/lintee/lintee.go")).then (e) ->
        sourceEditor = e
    waitsForPromise ->
      testFilePath = path.join(gopath, "src/lintee/lintee_test.go")
      atom.workspace.open(testFilePath).then (e) ->
        testEditor = e

  beforeEach ->
    createTestFiles()
    openTestFiles()

  beforeEach ->
    atom.config.set('go-plus.useAtomLinter', true)
    atom.config.set('go-plus.syntaxCheckOnSave', true)

  it 'will report gobuild errors to Atom linter', ->
    lintMessages = null

    isValidAtomLinterMessage = (msg) ->
      msg.type? and msg.text? and msg.filePath? and msg.range?

    messagesFor = (filename) ->
      _.filter(lintMessages, (m) -> m.filePath.indexOf(filename) isnt -1)

    waitsForPromise ->
      lintProvider.lint(testEditor).then (msg) -> lintMessages = msg

    runs ->
      expect(lintMessages.length).toBe(2)
      expect(_.every(lintMessages, isValidAtomLinterMessage)).toBe(true)
      expect(messagesFor("lintee.go").length).toBe(1)
      expect(messagesFor("lintee_test.go").length).toBe(1)

      # The editor for lintee.go isn't open, so the error will point at the
      # start of the line.
      lint1 = messagesFor("lintee.go")[0]
      expect(lint1.range).toEqual([[4, 0], [4, 0]])
      expect(lint1.text.indexOf('missing return')).not.toBe(-1)

      lint2 = messagesFor("lintee_test.go")[0]
      expect(lint2.range).toEqual([[8, 1], [8, 14]])
      expect(lint2.text.indexOf('undefined: brokenheretoo')).not.toBe(-1)
