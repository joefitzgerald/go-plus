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
    return unless editorView?
    @reset editorView
    @checkBuffer(editorView, false)

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
    re = new RegExp(buffer.getBaseName() + '$')
    cwd = buffer.getPath().replace(re, '')
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
      output = testPackage + '.test'
      outputPath = @tempDir
      args = ['test', '-copybinary', '-outputdir', outputPath,'-c', buffer.getPath()]
      files = fs.readdirSync(fileDir)
    else
      output = '.go-plus-syntax-check'
      outputPath = path.join(@tempDir, output)
      args = ['build', '-o', outputPath, '.']
    cmd = go.executable
    done = (exitcode, stdout, stderr, messages) =>
      console.log @name + ' - stdout: ' + stdout if stdout? and stdout.trim() isnt ''
      messages = @mapMessages(editorView, stderr, buffer.getBaseName()) if stderr? and stderr isnt ''
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
          if _.endsWith(file, '.test')
            fs.unlinkSync(path.join(fileDir, file))
      @emit @name + '-complete', editorView, saving
      callback(null, messages)
    @dispatch.executor.exec(cmd, cwd, env, done, args)

  mapMessages: (editorView, data, filename) ->
    pattern = /^(\.\/)?(.*?):(\d*?):((\d*?):)?\s((.*)?((\n\t.*)+)?)/img
    messages = []
    fre = new RegExp('^' + filename + '$', 'i')
    extract = (matchLine) ->
      return unless matchLine?
      file = matchLine[2]?.replace(/^.*[\\\/]/, '')
      if file?
        return unless file.match(fre)
      message = switch
        when matchLine[5]?
          line: matchLine[3]
          column: matchLine[5]
          msg: matchLine[6]
          type: 'error'
          source: 'syntaxcheck'
        else
          line: matchLine[3]
          column: false
          msg: matchLine[6]
          type: 'error'
          source: 'syntaxcheck'
      messages.push message
    loop
      match = pattern.exec(data)
      extract(match)
      break unless match?
    @emit @name + '-messages', editorView, messages
    return messages
