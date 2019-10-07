'use babel'
/* eslint-env jasmine */

import { lifecycle } from './../spec-helpers'
import { ReferencesProvider } from './../../lib/references/references-provider'
import path from 'path'
import fs from 'fs-extra'
import { it, beforeEach } from '../async-spec-helpers' // eslint-disable-line

describe('References Provider', () => {
  let references

  beforeEach(() => {
    lifecycle.setup()
    references = new ReferencesProvider()
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  describe('parseStream', () => {
    it('is able to handle a json object stream correctly', () => {
      // A JSON object stream is another name for malformed JSON
      const file = fs.readFileSync(
        path.join(__dirname, '..', 'fixtures', 'usage', 'referrers-1.json'),
        'utf8'
      )
      const result = references.parseStream(file)
      expect(result).toBeTruthy()
      expect(result.length).toBe(2)
      expect(result[0].objpos).toBe(
        '/Users/joe/go/src/github.com/kelseyhightower/envconfig/envconfig.go:33:6'
      )
      expect(result[0].desc).toBe(
        'type github.com/kelseyhightower/envconfig.Decoder interface{Decode(value string) error}'
      )
      expect(result[1].package).toBe('github.com/kelseyhightower/envconfig')
      expect(result[1].refs).toBeTruthy()
      expect(result[1].refs.length).toBe(3)
    })
  })

  describe('referrers', () => {
    it('parses output correctly', () => {
      const file = fs.readFileSync(
        path.join(__dirname, '..', 'fixtures', 'usage', 'referrers-1.json'),
        'utf8'
      )
      const j = references.parseStream(file)
      const result = references.parse(j)
      expect(result).toBeTruthy()
      expect(result.length).toEqual(3)
      expect(result[0].uri).toEqual(
        '/Users/joe/go/src/github.com/kelseyhightower/envconfig/envconfig.go'
      )
      expect(result[0].range.start.row).toBe(306)
      expect(result[0].range.start.column).toBe(42)
      expect(result[0].name).toBe(
        'func decoderFrom(field reflect.Value) (d Decoder) {'
      )
    })
  })

  describe('findReferences', () => {
    let editor
    let gopath = null
    let source = null
    let target = null

    beforeEach(async () => {
      gopath = fs.realpathSync(lifecycle.temp.mkdirSync('gopath-'))
      process.env.GOPATH = gopath

      await lifecycle.activatePackage()
      const { mainModule } = lifecycle
      references = mainModule.provideReferences()

      source = path.join(__dirname, '..', 'fixtures')
      target = path.join(gopath, 'src', 'references')
      fs.copySync(source, target)
      editor = await atom.workspace.open(path.join(target || '.', 'doc.go'))
    })
    afterEach(() => {
      lifecycle.teardown()
    })

    it('times out according to the configured Guru timeout', async () => {
      const testTimeout = 1
      atom.config.set('go-plus.guru.timeout', testTimeout)
      editor.setCursorBufferPosition([22, 2])
      const refs = await references.findReferences(
        editor,
        editor.getCursorBufferPosition()
      )
      expect(typeof refs).toBe('object')
      expect(refs.type).toBe('error')
      expect(refs.message.endsWith(testTimeout + 'ms')).toBe(true)
    })
  })
})
