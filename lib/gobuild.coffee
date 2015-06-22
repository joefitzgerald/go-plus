{spawn} = require('child_process')
fs = require('fs-plus')
glob = require('glob')
path = require('path')
temp = require('temp')
{Subscriber, Emitter} = require('emissary')
_ = require('underscore-plus')

module.exports =
class Gobuild
  Subscriber.includeInto(this)
  Emitter.includeInto(this)

  constructor: (dispatch) ->
    @dispatch = dispatch
    atom.commands.add 'atom-workspace',
      'golang:gobuild': => @checkCurrentBuffer()
    @name = 'syntaxcheck'

  destroy: ->
    @unsubscribe()
    @dispatch = null

  reset: (editor) ->
    @emit('reset', editor)

  checkCurrentBuffer: ->
    editor = atom?.workspace?.getActiveTextEditor()
    return unless @dispatch.isValidEditor(editor)
    @reset(editor)
    done = (err, messages) =>
      @dispatch.resetAndDisplayMessages(editor, messages)
    @checkBuffer(editor, false, done)

  checkBuffer: (editor, saving, callback = -> ) ->
    unless @dispatch.isValidEditor(editor)
      @emit(@name + '-complete', editor, saving)
      callback(null)
      return
    if saving and not atom.config.get('go-plus.syntaxCheckOnSave')
      @emit(@name + '-complete', editor, saving)
      callback(null)
      return
    buffer = editor?.getBuffer()
    unless buffer?
      @emit(@name + '-complete', editor, saving)
      callback(null)
      return

    go = @dispatch.goexecutable.current()
    unless go?
      callback(null)
      @dispatch.displayGoInfo(false)
      return
    gopath = go.buildgopath()
    if not gopath? or gopath is ''
      @emit(@name + '-complete', editor, saving)
      callback(null)
      return
    splitgopath = go.splitgopath()
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
      testPackage = if match? and match.length > 0 then match[1] else ''
      testPackage = testPackage.replace(/_test$/i, '')
      output = testPackage + '.test' + go.exe
      outputPath = @tempDir
      args = ['test', '-copybinary', '-o', outputPath, '-c', '.']
      files = fs.readdirSync(fileDir)
    else
      output = '.go-plus-syntax-check'
      outputPath = path.normalize(path.join(@tempDir, output + go.exe))
      args = ['build', '-o', outputPath, '.']
    cmd = go.executable
    done = (exitcode, stdout, stderr, messages) =>
      console.log(@name + ' - stdout: ' + stdout) if stdout? and stdout.trim() isnt ''
      messages = @mapMessages(stderr, cwd, splitgopath) if stderr? and stderr isnt ''
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
      pattern = cwd + '/*' + output
      glob pattern, {mark: false}, (er, files) ->
        for file in files
          do (file) ->
            fs.unlinkSync(file)
      @emit(@name + '-complete', editor, saving)
      callback(null, messages)
    @dispatch.executor.exec(cmd, cwd, env, done, args)

  mapMessages: (data, cwd, splitgopath) ->
    pattern = /^((#)\s(.*)?)|((.*?):(\d*?):((\d*?):)?\s((.*)?((\n\t.*)+)?))/img
    messages = []
    pkg = ''
    extract = (matchLine) ->
      return unless matchLine?
      if matchLine[2]? and matchLine[2] is '#'
        # Found A Package Indicator, Skip For Now
        # pkg = @absolutePathForPackage(matchLine[3], splitgopath)
      else
        file = null
        if matchLine[5]? and matchLine[5] isnt ''
          if path.isAbsolute(matchLine[5])
            file = matchLine[5]
          else
            file = path.join(cwd, matchLine[5])

        message = switch
          when matchLine[8]?
            file: file
            line: matchLine[6]
            column: matchLine[8]
            msg: matchLine[9]
            type: 'error'
            source: 'syntaxcheck'
          else
            file: file
            line: matchLine[6]
            column: false
            msg: matchLine[9]
            type: 'error'
            source: 'syntaxcheck'
        messages.push(message)
    loop
      match = pattern.exec(data)
      extract(match)
      break unless match?
    return messages

  absolutePathForPackage: (pkg, splitgopath) ->
    for gopath in splitgopath
      combinedpath = path.join(gopath, 'src', pkg)
      return fs.realpathSync(combinedpath) if fs.existsSync(combinedpath)
    null
