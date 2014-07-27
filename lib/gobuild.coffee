{spawn} = require 'child_process'
fs = require 'fs-plus'
glob = require 'glob'
path = require 'path'
temp = require 'temp'
{Subscriber, Emitter} = require 'emissary'
_ = require 'underscore-plus'

module.exports =
class Gobuild
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (@dispatch) ->
    atom.workspaceView.command 'golang:gobuild', => @checkCurrentBuffer()
    @name = 'syntaxcheck'

  destroy: ->
    @unsubscribe()

  reset: (editorView) ->
    @emit 'reset', editorView

  checkCurrentBuffer: ->
    editorView = atom.workspaceView.getActiveView()
    return unless @dispatch.isValidEditorView(editorView)
    @reset editorView
    done = (err, messages) =>
      @dispatch.resetAndDisplayMessages(editorView, messages)
    @checkBuffer(editorView, false, done)

  checkBuffer: (editorView, saving, callback = ->) ->
    unless @dispatch.isValidEditorView(editorView)
      @emit @name + '-complete', editorView, saving
      callback(null)
      return
    if saving and not atom.config.get('go-plus.syntaxCheckOnSave')
      @emit @name + '-complete', editorView, saving
      callback(null)
      return
    buffer = editorView?.getEditor()?.getBuffer()
    unless buffer?
      @emit @name + '-complete', editorView, saving
      callback(null)
      return

    go = @dispatch.goexecutable.current()
    gopath = go.buildgopath()
    if not gopath? or gopath is ''
      @emit @name + '-complete', editorView, saving
      callback(null)
      return
    env = @dispatch.env()
    env['GOPATH'] = gopath
    cwd = path.dirname(buffer.getPath())
    output = ''
    outputPath = ''
    files = []
    fileDir = path.dirname(buffer.getPath())
    args = []
    @tempDir = temp.mkdirSync()
    if buffer.getPath().match(/_test.go$/i)
      pre = /^\w*package ([\d\w]+){1}\w*$/img # Need To Support Unicode Letters Also
      match = pre.exec(buffer.getText())
      testPackage = match[1]
      testPackage = testPackage.replace(/_test$/i, '')
      output = testPackage + '.test' + go.exe
      outputPath = @tempDir
      args = ['test', '-copybinary', '-outputdir', outputPath,'-c', '.']
      files = fs.readdirSync(fileDir)
    else
      output = '.go-plus-syntax-check'
      outputPath = path.join(@tempDir, output + go.exe)
      args = ['build', '-o', outputPath, '.']
    cmd = go.executable
    done = (exitcode, stdout, stderr, messages) =>
      console.log @name + ' - stdout: ' + stdout if stdout? and stdout.trim() isnt ''
      messages = @mapMessages(editorView, stderr, cwd) if stderr? and stderr isnt ''
      pattern = cwd + '/*' + output
      glob pattern, {mark: false, sync:true}, (er, files) ->
        for file in files
          do (file) ->
            fs.unlinkSync(file)
      if fs.existsSync(outputPath)
        if fs.lstatSync(outputPath).isDirectory()
          fs.rmdirSync(outputPath)
        else
          fs.unlinkSync(outputPath)
      updatedFiles = _.difference(fs.readdirSync(fileDir), files)
      if updatedFiles? and _.size(updatedFiles) > 0
        for file in updatedFiles
          if _.endsWith(file, '.test' + go.exe)
            fs.unlinkSync(path.join(fileDir, file))
      @emit @name + '-complete', editorView, saving
      callback(null, messages)
    @dispatch.executor.exec(cmd, cwd, env, done, args)

  mapMessages: (editorView, data, cwd) ->
    pattern = /^(.*?):(\d*?):((\d*?):)?\s((.*)?((\n\t.*)+)?)/img
    messages = []
    extract = (matchLine) ->
      return unless matchLine?
      file = null
      if matchLine[1]? and matchLine[1] isnt ''
        if matchLine[1].substring(0, 1) is '.'
          file = path.join(cwd, matchLine[1])
        else
          file = matchLine[1]

      message = switch
        when matchLine[4]?
          file: file
          line: matchLine[2]
          column: matchLine[4]
          msg: matchLine[5]
          type: 'error'
          source: 'syntaxcheck'
        else
          file: file
          line: matchLine[2]
          column: false
          msg: matchLine[5]
          type: 'error'
          source: 'syntaxcheck'
      messages.push message
    loop
      match = pattern.exec(data)
      extract(match)
      break unless match?
    @emit @name + '-messages', editorView, messages
    return messages
