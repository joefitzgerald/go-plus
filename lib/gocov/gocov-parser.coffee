{Range} = require 'atom'
_ = require 'underscore-plus'

testData = """
mode: set
github.com/rubyist/go-dnsimple/dnsimple.go:32.56,34.2 1 1
github.com/rubyist/go-dnsimple/dnsimple.go:36.71,38.16 2 1
github.com/rubyist/go-dnsimple/dnsimple.go:42.2,42.58 1 1
github.com/rubyist/go-dnsimple/dnsimple.go:46.2,46.12 1 1
github.com/rubyist/go-dnsimple/dnsimple.go:38.16,40.3 1 0
github.com/rubyist/go-dnsimple/dnsimple.go:42.58,44.3 1 0
github.com/rubyist/go-dnsimple/dnsimple.go:49.101,51.16 2 1
github.com/rubyist/go-dnsimple/dnsimple.go:55.2,56.16 2 1
github.com/rubyist/go-dnsimple/dnsimple.go:60.2,60.58 1 1
github.com/rubyist/go-dnsimple/dnsimple.go:64.2,64.20 1 1
github.com/rubyist/go-dnsimple/dnsimple.go:51.16,53.3 1 0
github.com/rubyist/go-dnsimple/dnsimple.go:56.16,58.3 1 0
github.com/rubyist/go-dnsimple/dnsimple.go:60.58,62.3 1 0
github.com/rubyist/go-dnsimple/dnsimple.go:67.87,69.2 1 1
github.com/rubyist/go-dnsimple/dnsimple.go:71.88,73.2 1 1
github.com/rubyist/go-dnsimple/dnsimple.go:75.103,82.16 6 1
github.com/rubyist/go-dnsimple/dnsimple.go:85.2,85.17 1 1
github.com/rubyist/go-dnsimple/dnsimple.go:82.16,84.3 1 0
github.com/rubyist/go-dnsimple/dnsimple.go:88.101,90.16 2 1
github.com/rubyist/go-dnsimple/dnsimple.go:94.2,95.16 2 1
github.com/rubyist/go-dnsimple/dnsimple.go:98.2,101.16 3 1
github.com/rubyist/go-dnsimple/dnsimple.go:105.2,105.52 1 1
github.com/rubyist/go-dnsimple/dnsimple.go:90.16,92.3 1 0
github.com/rubyist/go-dnsimple/dnsimple.go:95.16,97.3 1 0
github.com/rubyist/go-dnsimple/dnsimple.go:101.16,103.3 1 0
github.com/rubyist/go-dnsimple/domain.go:32.49,33.31 1 1
github.com/rubyist/go-dnsimple/domain.go:43.2,43.11 1 0
github.com/rubyist/go-dnsimple/domain.go:34.2,35.15 1 1
github.com/rubyist/go-dnsimple/domain.go:36.2,37.34 1 1
github.com/rubyist/go-dnsimple/domain.go:38.2,39.37 1 1
github.com/rubyist/go-dnsimple/domain.go:40.2,41.43 1 1
github.com/rubyist/go-dnsimple/domain.go:46.44,47.19 1 1
github.com/rubyist/go-dnsimple/domain.go:47.19,49.3 1 1
github.com/rubyist/go-dnsimple/domain.go:49.4,51.3 1 1
github.com/rubyist/go-dnsimple/domain.go:54.59,57.69 2 1
github.com/rubyist/go-dnsimple/domain.go:61.2,62.40 2 1
github.com/rubyist/go-dnsimple/domain.go:66.2,66.21 1 1
github.com/rubyist/go-dnsimple/domain.go:57.69,59.3 1 0
github.com/rubyist/go-dnsimple/domain.go:62.40,64.3 1 1
github.com/rubyist/go-dnsimple/domain.go:69.74,72.71 2 1
github.com/rubyist/go-dnsimple/domain.go:76.2,76.34 1 1
github.com/rubyist/go-dnsimple/domain.go:72.71,74.3 1 0
github.com/rubyist/go-dnsimple/domain.go:79.81,84.16 3 1
github.com/rubyist/go-dnsimple/domain.go:88.2,88.27 1 1
github.com/rubyist/go-dnsimple/domain.go:84.16,86.3 1 0
github.com/rubyist/go-dnsimple/domain.go:91.86,95.15 3 1
github.com/rubyist/go-dnsimple/domain.go:100.2,102.16 2 1
github.com/rubyist/go-dnsimple/domain.go:105.2,105.12 1 1
github.com/rubyist/go-dnsimple/domain.go:95.15,97.3 1 1
github.com/rubyist/go-dnsimple/domain.go:97.4,99.3 1 1
github.com/rubyist/go-dnsimple/domain.go:102.16,104.3 1 0
github.com/rubyist/go-dnsimple/domain.go:108.82,114.16 3 1
github.com/rubyist/go-dnsimple/domain.go:118.2,118.19 1 1
github.com/rubyist/go-dnsimple/domain.go:122.2,122.12 1 1
github.com/rubyist/go-dnsimple/domain.go:114.16,116.3 1 0
github.com/rubyist/go-dnsimple/domain.go:118.19,120.3 1 0
github.com/rubyist/go-dnsimple/record.go:25.60,27.19 2 1
github.com/rubyist/go-dnsimple/record.go:30.2,30.12 1 1
github.com/rubyist/go-dnsimple/record.go:27.19,29.3 1 1
github.com/rubyist/go-dnsimple/record.go:33.102,37.16 3 1
github.com/rubyist/go-dnsimple/record.go:41.2,41.22 1 1
github.com/rubyist/go-dnsimple/record.go:45.2,49.60 3 1
github.com/rubyist/go-dnsimple/record.go:53.2,54.40 2 1
github.com/rubyist/go-dnsimple/record.go:58.2,58.21 1 1
github.com/rubyist/go-dnsimple/record.go:37.16,39.3 1 1
github.com/rubyist/go-dnsimple/record.go:41.22,43.3 1 1
github.com/rubyist/go-dnsimple/record.go:49.60,51.3 1 0
github.com/rubyist/go-dnsimple/record.go:54.40,56.3 1 1
github.com/rubyist/go-dnsimple/record.go:61.95,67.16 4 1
github.com/rubyist/go-dnsimple/record.go:71.2,71.19 1 1
github.com/rubyist/go-dnsimple/record.go:75.2,75.35 1 1
github.com/rubyist/go-dnsimple/record.go:67.16,69.3 1 0
github.com/rubyist/go-dnsimple/record.go:71.19,73.3 1 0
github.com/rubyist/go-dnsimple/record.go:78.95,90.16 4 1
github.com/rubyist/go-dnsimple/record.go:94.2,94.19 1 1
github.com/rubyist/go-dnsimple/record.go:98.2,98.35 1 1
github.com/rubyist/go-dnsimple/record.go:90.16,92.3 1 0
github.com/rubyist/go-dnsimple/record.go:94.19,96.3 1 0
github.com/rubyist/go-dnsimple/record.go:101.60,103.16 2 1
github.com/rubyist/go-dnsimple/record.go:107.2,107.19 1 1
github.com/rubyist/go-dnsimple/record.go:110.2,110.46 1 0
github.com/rubyist/go-dnsimple/record.go:103.16,105.3 1 0
github.com/rubyist/go-dnsimple/record.go:107.19,109.3 1 1
github.com/rubyist/go-dnsimple/record.go:113.73,117.2 3 1
"""

module.exports =
class GocovParser
  constructor: (dispatch) ->
    @dispatch = dispatch

  # TODO disgusting - fix this parsing, regex
  rangesForFile: (file) ->
    ranges = []

    for line in testData.split("\n")
      line = line.trim()
      continue if line == "mode: set"
      [fileLinesCols, statements, count] = line.split(" ")
      [filePath, linesCols] = fileLinesCols.split(":")
      if _.endsWith(file, filePath)
        [start, end] = linesCols.split(",")
        [startRow, startCol] = start.split(".")
        [endRow, endCol] = end.split(".")

        range = new Range([parseInt(startRow)-1, parseInt(startCol)-1], [parseInt(endRow)-1, parseInt(endCol)+1])
        ranges.push range: range, count: parseInt(count)

    ranges
