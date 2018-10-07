// @flow
'use babel'

import fs from 'fs'
import { Range } from 'atom'

export type CoverageRange = {
  range: Range,
  count: number,
  file: string
}

const ranges = (coverageFile: string): Array<CoverageRange> => {
  let data
  const ranges = []
  try {
    data = fs.readFileSync(coverageFile, { encoding: 'utf8' })
  } catch (e) {
    return ranges
  }

  // https://code.google.com/p/go/source/browse/cmd/cover/profile.go?repo=tools&name=a2a0f87c4b38&r=92b0a64343bc62160c1c10d335d375b0defa4c18#113
  const pattern = /^(.+):(\d+).(\d+),(\d+).(\d+) (\d+) (\d+)$/img

  const extract = (match) => {
    if (!match) {
      return
    }
    const filePath = match[1]
    const count = match[7]
    const range = new Range([parseInt(match[2], 10) - 1, parseInt(match[3], 10) - 1], [parseInt(match[4], 10) - 1, parseInt(match[5], 10) - 1])
    ranges.push({ range: range, count: parseInt(count, 10), file: filePath })
  }

  let match
  while ((match = pattern.exec(data)) !== null) {
    extract(match)
  }

  return ranges
}

export default { ranges }
