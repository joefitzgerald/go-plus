/* eslint-env jasmine */

import { ranges } from './../../lib/test/gocover-parser'
import path from 'path'
import { it, fit, ffit, beforeEach, runs } from '../async-spec-helpers' // eslint-disable-line

describe('gocover-parser', () => {
  it('parses the file for a single package', async () => {
    const testDir = path.join(__dirname, '..', 'fixtures', 'test')
    const file = path.join(testDir, 'coverage.out')
    const src =
      '/Users/zmb3/github/go-plus/spec/fixtures/test/src/github.com/testuser/example/go-plus.go'

    const result = ranges(file)
    expect(result.length).toBe(2)
    expect(result[0].range.start.column).toBe(12)
    expect(result[0].range.start.row).toBe(4)
    expect(result[0].range.end.column).toBe(1)
    expect(result[0].range.end.row).toBe(6)
    expect(result[0].count).toBe(0)
    expect(result[0].file).toBe(src)

    expect(result[1].range.start.column).toBe(20)
    expect(result[1].range.start.row).toBe(8)
    expect(result[1].range.end.column).toBe(1)
    expect(result[1].range.end.row).toBe(10)
    expect(result[1].count).toBe(1)
    expect(result[1].file).toBe(src)
  })
})
