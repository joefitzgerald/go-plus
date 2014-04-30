{$, $$, View} = require 'atom'
{Subscriber, Emitter} = require 'emissary'
OracleCommand = require "./oracle-command"

module.exports =
class GoOracle extends View
  @content: ->
    @div class: 'go-oracle tool-panel pannel panel-bottom padding', =>
      @h4 class: 'header', =>
        @span " oracle ", class: "title"
        @select outlet: 'modes'
      @div " Loading", class: "loading"
      @div outlet: 'data', class: 'panel-body padded'

  initialize: (@dispatch) ->
    @data.on 'click', '.source', (event) =>
      @navigateTo($(event.target).data('uri'))

    @oracle = new OracleCommand(@dispatch)
    @oracle.on 'oracle-complete', (command, data) =>
      @displayOracle(command, data)

    @oracle.on 'what-complete', (data) =>
      @availableModes = data.what.modes

    @modes.on 'change', =>
      # TODO maybe validate the modes since it shells out?
      @runOracle(@modes.val())

    atom.workspaceView.command "golang:oracle", => @openOracle()
    atom.workspaceView.command "core:cancel core:close", => @destroy()


  # Returns an object that can be retrieved when package is activated
  serialize: ->

  # Tear down any state and detach
  destroy: ->
    @unsubscribe()
    @detach()

  navigateTo: (fileURL) ->
    # Files usually end in: foo.go:70:31            - line 70, col 31
    # Sometemes end in a range: foo.go:84.21-84.31  - line 84, cols 21 - 31
    normal = /(.+):(\d+):(\d+)$/
    range  = /(.+):(\d+)\.(\d+)-(?:\d+)(?:\.\d+)$/

    matches = normal.exec(fileURL) || range.exec(fileURL)
    file = matches[1]
    line = parseInt(matches[2]) - 1
    col = parseInt(matches[3]) - 1

    atom.workspace.open(file).then (newEditor) ->
      newEditor.setCursorBufferPosition([line, col])

  displayOracle: (command, data) ->
    @find('.loading').hide()

    @modes.empty()
    for mode in @availableModes
      @modes.append("<option value=\"#{mode}\">#{mode}</option>")
    @modes.val(command)

    @data.html $$ ->
      @ul class: 'oracle-data', =>
        for line in String(data).split("\n")
          continue if line == ""
          parts = line.split(": ")
          @li class: 'source', "data-uri": parts[0], parts[1]

  openOracle: ->
    atom.workspaceView.prependToBottom(this)
    @runOracle('describe')

  runOracle: (command) ->
    @find('ul').empty()
    @find('.loading').show()
    @oracle.command(command)
