/* eslint-env jasmine */

import {importablePackages} from './../../lib/import/importer'

describe('importablePackages', () => {
  const all = [
    'github.com/user1/project1/',
    'github.com/user1/project1/subpackage',
    'github.com/user1/project1/internal/privatelib',
    'github.com/user2/project1/vendor/github.com/author/lib/subpackage',
    'github.com/user2/project1/nested/package',
    'github.com/user2/project2/subpackage/vendor/github.com/author/lib/subpackage'
  ]

  it('does not present vendor or internal directories from other projects', () => {
    const importable = importablePackages('github.com/user3/newproject', all)
    expect(importable).toEqual([
      all[0],
      all[1],
      all[4]
    ])
  })

  it('presents internal packages for the same project', () => {
    const importable = importablePackages('github.com/user1/project1/foo', all)
    expect(importable).toContain('github.com/user1/project1/internal/privatelib')
  })

  it('presents vendor packages for the same project', () => {
    const importable = importablePackages('github.com/user2/project1/foo/bar', all)
    expect(importable).toContain('github.com/author/lib/subpackage')
  })

  it('handles nested vendor packages correctly', () => {
    const nestedVendor = 'github.com/author/lib/subpackage'
    expect(importablePackages('github.com/user2/project2/foo/bar', all)).not.toContain(nestedVendor)
    expect(importablePackages('github.com/user2/project2/subpackage/a/b', all)).toContain(nestedVendor)
  })
})
