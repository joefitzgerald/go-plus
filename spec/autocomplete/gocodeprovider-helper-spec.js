'use babel'
/* eslint-env jasmine */

import {getPackage} from '../../lib/autocomplete/gocodeprovider-helper'
import * as path from 'path'

describe('gocodeprovider-helper', () => {
  describe('getPackage', () => {
    function normalize (v) {
      return (process.platform === 'win32' ? 'C:' : '') + path.normalize(v)
    }
    it('returns a non-vendored package if `useVendor` is false', () => {
      const pkg = getPackage(
        normalize('/Users/me/go/src/github.com/foo/server/main.go'),
        normalize('/Users/me/go'),
        [
          'github.com/foo/server/vendor/github.com/bar/lib',
          'github.com/foo/lib'
        ],
        false // <-- vendor is not active
      )
      expect(pkg).toBe('github.com/foo/lib')
    })

    it('returns a vendored package if `useVendor` is true', () => {
      const pkg = getPackage(
        normalize('/Users/me/go/src/github.com/foo/server/main.go'),
        normalize('/Users/me/go'),
        [
          'github.com/foo/server/vendor/github.com/bar/lib',
          'github.com/foo/lib'
        ],
        true // <-- vendor is active
      )
      expect(pkg).toBe('github.com/bar/lib')
    })

    it('gets vendored package if inside sub package', () => {
      const pkg = getPackage(
        normalize('/Users/me/go/src/github.com/foo/server/sub/sub.go'), // <-- inside sub package
        normalize('/Users/me/go'),
        [
          'github.com/foo/server/vendor/github.com/bar/lib',
          'github.com/foo/lib'
        ],
        true
      )
      expect(pkg).toBe('github.com/bar/lib')
    })

    it('ignores nested vendored packages', () => {
      const pkg = getPackage(
        normalize('/Users/me/go/src/github.com/foo/server/main.go'),
        normalize('/Users/me/go'),
        [
          'github.com/foo/server/vendor/github.com/bar/lib/vendor/github.com/baz/other'
        ],
        true
      )
      expect(pkg).toBeFalsy()
    })

    it('returns non-vendored package if vendor does not match', () => {
      const pkg = getPackage(
        normalize('/Users/me/go/src/github.com/foo/server/main.go'),
        normalize('/Users/me/go'),
        [
          // ignores this package because it is inside the "bar" package not "foo"
          'github.com/bar/server/vendor/github.com/baz/lib',
          // returns this because no vendored package matches
          'github.com/qux/lib'
        ],
        true
      )
      expect(pkg).toBe('github.com/qux/lib')
    })

    it('returns another vendored package inside a vendored package', () => {
      const pkg = getPackage(
        // a file inside a vendored package ...
        normalize('/Users/me/go/src/github.com/foo/server/vendor/github.com/bar/lib/lib.go'),
        normalize('/Users/me/go'),
        [
          // ... is allowed to use another vendored package
          'github.com/foo/server/vendor/github.com/baz/other'
        ],
        true
      )
      expect(pkg).toBe('github.com/baz/other')
    })
  })
})
