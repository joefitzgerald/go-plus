'use babel'

import {Range} from 'atom'
import fs from 'fs'

function ranges (coverageFile) {
  let data
  let ranges = []
  try {
    data = fs.readFileSync(coverageFile, {encoding: 'utf8'})
  } catch (e) {
    return ranges
  }

  // https://code.google.com/p/go/source/browse/cmd/cover/profile.go?repo=tools&name=a2a0f87c4b38&r=92b0a64343bc62160c1c10d335d375b0defa4c18#113
  let pattern = /^(.+):(\d+).(\d+),(\d+).(\d+) (\d+) (\d+)$/img

  let extract = (match) => {
    if (!match) {
      return
    }
    let filePath = match[1]
    // let statements = match[6]
    let count = match[7]
    let range = new Range([parseInt(match[2], 10) - 1, parseInt(match[3], 10) - 1], [parseInt(match[4], 10) - 1, parseInt(match[5], 10) - 1])
    ranges.push({range: range, count: parseInt(count, 10), file: filePath})
  }

  let match
  while ((match = pattern.exec(data)) !== null) {
    extract(match)
  }

  return ranges
}

export default {ranges}
