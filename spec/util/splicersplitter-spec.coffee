_ = require('underscore-plus')
path = require('path')
SplicerSplitter = require('./../../lib/util/splicersplitter')

describe 'splicersplitter', ->
  [splicersplitter] = []

  beforeEach ->
    splicersplitter = new SplicerSplitter()

  describe 'when working with space delimeted text', ->

    it 'splits the text into an array', ->
      runs ->
        result = splicersplitter.splitAndSquashToArray(' ', ' -v  -b')
        expect(result).toBeDefined()
        expect(result).toBeTruthy()
        expect(_.size(result)).toBe(2)
        expect(result[0]).toBeDefined()
        expect(result[0]).toBe('-v')
        expect(result[1]).toBeDefined()
        expect(result[1]).toBe('-b')

        result = splicersplitter.splitAndSquashToArray(' ', '     ')
        expect(result).toBeDefined()
        expect(result).toBeTruthy()
        expect(_.size(result)).toBe(0)

        result = splicersplitter.splitAndSquashToArray(' ')
        expect(result).toBeDefined()
        expect(result).toBeTruthy()
        expect(_.size(result)).toBe(0)

    it 'joins the array into a string', ->
      runs ->
        result = splicersplitter.spliceAndSquash(['', ' ', ' -a ', '-b ', ' ', ' -c'])
        expect(result).toBeDefined()
        expect(result).toBeTruthy()
        expect(result.length).toBe(8)
        expect(result).toBe('-a -b -c')

        result = result = splicersplitter.spliceAndSquash(['', ' ', '  ', ' ', ' ', ''])
        expect(result).toBeDefined()
        expect(result.length).toBe(0)
        expect(result).toBe('')

        result = result = splicersplitter.spliceAndSquash([])
        expect(result).toBeDefined()
        expect(result.length).toBe(0)
        expect(result).toBe('')

        result = result = splicersplitter.spliceAndSquash()
        expect(result).toBeDefined()
        expect(result.length).toBe(0)
        expect(result).toBe('')

  describe 'when working with delimited text', ->

    it 'splits the text into an array', ->
      runs ->
        result = splicersplitter.splitAndSquashToArray(path.delimiter, path.delimiter + ' -v ' + path.delimiter + ' -b' + path.delimiter)
        expect(result).toBeDefined()
        expect(result).toBeTruthy()
        expect(_.size(result)).toBe(2)
        expect(result[0]).toBeDefined()
        expect(result[0]).toBe('-v')
        expect(result[1]).toBeDefined()
        expect(result[1]).toBe('-b')
