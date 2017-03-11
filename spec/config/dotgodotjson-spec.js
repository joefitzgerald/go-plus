'use babel'
/* eslint-env jasmine */

import {DotGoDotJson} from './../../lib/config/dotgodotjson'
import {lifecycle} from './../spec-helpers'
import path from 'path'
import fs from 'fs-extra'

describe('DotGoDotJson', () => {
  let [dotgodotjson] = []
  beforeEach(() => {
    dotgodotjson = new DotGoDotJson()
  })

  afterEach(() => {
    if (dotgodotjson) {
      dotgodotjson.dispose()
    }
    dotgodotjson = null
  })

  describe('when there are no .go.json files in the project', () => {
    describe('search', () => {
      it('returns a falsy value', () => {
        expect(dotgodotjson.search()).toBeFalsy()
      })
    })
  })

  describe('when there is one .go.json file in the root of a single project', () => {
    let [project, filepath] = []
    beforeEach(() => {
      project = lifecycle.temp.mkdirSync('godotjson')
      dotgodotjson.getProjectPaths = () => { return [project] }
      filepath = path.join(project, '.go.json')
      fs.writeFileSync(filepath, '{}')
    })

    describe('search', () => {
      it('does not return a falsy value', () => {
        const result = dotgodotjson.search()
        expect(result).toBeTruthy()
        expect(result.length).toBeGreaterThan(0)
      })
    })
  })

  describe('when there is one .go.json file in a cmd/binary folder of a single project', () => {
    let [project, folder, filepath] = []
    beforeEach(() => {
      project = lifecycle.temp.mkdirSync('godotjson')
      folder = path.join(project, 'cmd', 'sample')
      fs.mkdirsSync(folder)
      dotgodotjson.getProjectPaths = () => { return [project] }
      filepath = path.join(folder, '.go.json')
      fs.writeFileSync(filepath, '{}')
    })

    describe('search', () => {
      it('does not return a falsy value', () => {
        const result = dotgodotjson.search()
        expect(result).toBeTruthy()
        expect(result.length).toBeGreaterThan(0)
      })
    })
  })
})
