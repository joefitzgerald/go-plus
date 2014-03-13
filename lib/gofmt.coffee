spawn = require('child_process').spawn

module.exports =
class Gofmt
  $ = require('atom').$

  constructor: ->
    atom.workspace.eachEditor (editor) =>
      @handleBufferEvents(editor)

  destroy: ->
    @unsubscribe

  handleBufferEvents: (editor) ->
    buffer = editor.getBuffer()
    buffer.on 'saved', =>
      @formatBuffer(buffer, editor, true)

  formatCurrentBuffer: ->
    editor = atom.workspace.getActiveEditor()
    @formatBuffer(editor.getBuffer(), editor, false)

  formatBuffer: (buffer, editor, saving) ->
    grammar = editor.getGrammar()
    return if saving and not atom.config.get('go-plus.formatOnSave')
    return if grammar.scopeName isnt 'source.go'
    @resetState(editor)
    args = ["-w", buffer.getPath()]
    fmtCmd = atom.config.get('go-plus.gofmtPath')
    fmt = spawn(fmtCmd, args)
    fmt.on 'error', (error) -> console.log 'go-plus: error launching format command [' + fmtCmd + '] – ' + error  + ' – current PATH: [' + process.env.PATH + ']' if error?
    fmt.stderr.on 'data', (data) => @displayErrors(buffer, editor, data)
    fmt.stdout.on 'data', (data) -> console.log 'go-plus: format – ' + data if data?
    fmt.on 'close', (code) -> console.log fmtCmd + 'go-plus: format – exited with code [' + code + ']' if code isnt 0

  displayErrors: (buffer, editor, data) ->
    pattern = /^(.*?):(\d*?):(\d*?):\s(.*)$/img
    errors = []
    extract = (matchLine) ->
      return unless matchLine?
      error = [matchLine[2], matchLine[3], matchLine[4]]
      errors.push error
    loop
      match = pattern.exec(data)
      extract(match)
      break unless match?
    @updatePane(errors)
    @updateGutter(errors)

  resetState: (editor) ->
    @updateGutter([])
    @updatePane([])

  updateGutter: (errors) ->
    atom.workspaceView.eachEditorView (editorView) =>
      return unless editorView.active
      gutter = editorView.gutter
      gutter.removeClassFromAllLines('go-plus-error')
      gutter.addClassToLine error[0] - 1, 'go-plus-error' for error in errors

  updatePane: (errors) ->
    $('#go-plus-status-pane').remove()
    return unless errors?
    return if errors.length <= 0
    return unless atom.config.get('go-plus.showErrorPanel')
    html = $('<div id="go-plus-status-pane" class="go-plus-pane" style="height:">');
    for error in errors
      html.append('Line: ' + error[0] + ' Char: ' + error[1] + ' – ' + error[2])
      html.append('<br/>')
    atom.workspaceView.prependToBottom(html)
