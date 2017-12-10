/* eslint-env jasmine */

import path from 'path'

import {importablePackages} from './../../lib/import/importer'
import {lifecycle} from './../spec-helpers'

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

describe('importer', () => {
  let importer = null
  let editor = null

  beforeEach(() => {
    runs(() => {
      lifecycle.setup()
    })

    waitsForPromise(() => {
      return lifecycle.activatePackage()
    })

    runs(() => {
      const { mainModule } = lifecycle
      mainModule.provideGoConfig()
      mainModule.loadImporter()
    })

    waitsFor(() => {
      importer = lifecycle.mainModule.importer
      return importer
    })

    waitsForPromise(() => {
      return atom.workspace.open(path.join(__dirname, '..', 'fixtures', 'doc.go')).then(e => { editor = e })
    })
  })

  afterEach(() => lifecycle.teardown())

  it('adds imports', () => {
    let result

    waitsForPromise(() => {
      return importer.addImport('bufio').then(r => { result = r })
    })

    runs(() => {
      expect(result.success).toBe(true)
      expect(editor.lineTextForBufferRow(3).trim()).toEqual('"bufio"')
    })
  })
})
