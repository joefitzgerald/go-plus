{Range} = require('atom')
_ = require('underscore-plus')
fs = require('fs-plus')

module.exports =
class GocoverParser
  setDataFile: (file) ->
    @dataFile = file

  rangesForFile: (file) ->
    ranges = @ranges(@dataFile)
    _.filter(ranges, (r) -> _.endsWith(file, r.file))

  ranges: (dataFile) ->
    try
      data = fs.readFileSync(dataFile, {encoding: 'utf8'})
    catch error
      return []

    ranges = []

    # https://code.google.com/p/go/source/browse/cmd/cover/profile.go?repo=tools&name=a2a0f87c4b38&r=92b0a64343bc62160c1c10d335d375b0defa4c18#113
    pattern = /^(.+):(\d+).(\d+),(\d+).(\d+) (\d+) (\d+)$/img

    extract = (match) ->
      return unless match?
      filePath = match[1]
      statements = match[6]
      count = match[7]
      range = new Range([parseInt(match[2]) - 1, parseInt(match[3]) - 1], [parseInt(match[4]) - 1, parseInt(match[5]) - 1])
      ranges.push({range: range, count: parseInt(count), file: filePath})
    loop
      match = pattern.exec(data)
      extract(match)
      break unless match?

    ranges
