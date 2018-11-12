'use babel'
/* eslint-env jasmine */

import { lifecycle } from './spec-helpers'
import { parseGoPosition, stat } from './../lib/utils'

describe('utils', () => {
  beforeEach(() => {
    lifecycle.setup()
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  describe('parseGoPosition(identifier)', () => {
    it('parses unix paths', () => {
      const parsed = parseGoPosition(
        '/private/temp/src/gopath-11726-3832-1xl0vhg.4128uayvi/src/what/doc.go:23:2'
      )
      expect(parsed).toBeTruthy()
      expect(parsed.file).toBe(
        '/private/temp/src/gopath-11726-3832-1xl0vhg.4128uayvi/src/what/doc.go'
      )
      expect(parsed.line).toBe(23)
      expect(parsed.column).toBe(2)
    })

    it('parses windows paths', () => {
      const parsed = parseGoPosition(
        'C:\\Users\\vagrant\\AppData\\Local\\Temp\\2\\gopath-11726-3832-1xl0vhg.4128uayvi\\src\\what\\doc.go:23:2'
      )
      expect(parsed).toBeTruthy()
      expect(parsed.file).toBe(
        'C:\\Users\\vagrant\\AppData\\Local\\Temp\\2\\gopath-11726-3832-1xl0vhg.4128uayvi\\src\\what\\doc.go'
      )
      expect(parsed.line).toBe(23)
      expect(parsed.column).toBe(2)
    })
  })

  describe('stat', () => {
    it('is rejected for nonexistent files', () => {
      let result, err

      waitsForPromise(() => {
        return stat('nonexistentthing')
          .then(r => (result = r))
          .catch(e => (err = e))
      })

      runs(() => {
        expect(result).toBeFalsy()
        expect(err).toBeTruthy()
      })
    })
  })
})
