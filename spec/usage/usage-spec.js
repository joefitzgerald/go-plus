'use babel'
/* eslint-env jasmine */

import {lifecycle} from './../spec-helpers'
import {Usage} from './../../lib/usage/usage'
import path from 'path'
import fs from 'fs'

describe('usage', () => {
  let [usage] = []

  beforeEach(() => {
    lifecycle.setup()
    usage = new Usage()
  })

  afterEach(() => {
    usage.dispose()
    usage = null
    lifecycle.teardown()
  })

  describe('parseStream', () => {
    it('is able to handle a json object stream correctly', () => {
      // A JSON object stream is another name for malformed JSON
      const file = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'usage', 'referrers-1.json'), 'utf8')
      const result = usage.parseStream(file)
      expect(result).toBeTruthy()
      expect(result.length).toBe(2)
      expect(result[0].objpos).toBe('/Users/joe/go/src/github.com/kelseyhightower/envconfig/envconfig.go:33:6')
      expect(result[0].desc).toBe('type github.com/kelseyhightower/envconfig.Decoder interface{Decode(value string) error}')
      expect(result[1].package).toBe('github.com/kelseyhightower/envconfig')
      expect(result[1].refs).toBeTruthy()
      expect(result[1].refs.length).toBe(3)
    })
  })

  describe('referrers', () => {
    it('parses output correctly', () => {
      const file = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'usage', 'referrers-1.json'), 'utf8')
      const j = usage.parseStream(file)
      const result = usage.parse(j)
      expect(result).toBeTruthy()
      expect(result.packages instanceof Map).toBe(true)
      expect(result.packages.size).toBe(1)
      expect(Array.from(result.packages.values())[0].length).toBe(3)
      expect(Array.from(result.packages.values())[0][0].filename).toBe('/Users/joe/go/src/github.com/kelseyhightower/envconfig/envconfig.go')
      expect(Array.from(result.packages.values())[0][0].row).toBe(306)
      expect(Array.from(result.packages.values())[0][0].column).toBe(42)
      expect(Array.from(result.packages.values())[0][0].text).toBe('func decoderFrom(field reflect.Value) (d Decoder) {')
    })
  })
})
