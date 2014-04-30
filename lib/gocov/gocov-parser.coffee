{Range} = require 'atom'
_ = require 'underscore-plus'
fs = require 'fs-plus'

module.exports =
class GocovParser
  constructor: (dispatch) ->
    @dispatch = dispatch

  setDataFile: (file) ->
    @dataFile = file

  # TODO disgusting - fix this parsing, regex
  rangesForFile: (file) ->
    try
      data = fs.readFileSync @dataFile, {encoding: "utf8"}
    catch error
      return []

    ranges = []

    for line in data.split("\n")
      line = line.trim()
      continue if line == "mode: set" || line == ""
      [fileLinesCols, statements, count] = line.split(" ")
      [filePath, linesCols] = fileLinesCols.split(":")
      if _.endsWith(file, filePath)
        [start, end] = linesCols.split(",")
        [startRow, startCol] = start.split(".")
        [endRow, endCol] = end.split(".")

        range = new Range([parseInt(startRow)-1, parseInt(startCol)-1], [parseInt(endRow)-1, parseInt(endCol)-1])
        ranges.push range: range, count: parseInt(count)

    ranges
