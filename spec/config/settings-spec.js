'use babel'
/* eslint-env jasmine */

import {Settings} from './../../lib/config/settings'
import {lifecycle} from './../spec-helpers'
import path from 'path'
import fs from 'fs-extra'

describe('Settings', () => {
  let [settings] = []
  beforeEach(() => {
    settings = new Settings()
  })

  afterEach(() => {
    if (settings) {
      settings.dispose()
    }
    settings = null
  })

  describe('when there are no .go.json files in the project', () => {
    describe('files', () => {
      it('returns a falsy value', () => {
        expect(settings.files()).toBeFalsy()
      })
    })

    describe('getCommand', () => {

    })
  })

  describe('when there is one .go.json file in the root of a single project', () => {
    let [project, filepath] = []
    beforeEach(() => {
      project = lifecycle.temp.mkdirSync('godotjson')
      settings.getProjectPaths = () => { return [project] }
      filepath = path.join(project, '.go.json')
      fs.writeFileSync(filepath, '{}')
    })

    describe('files', () => {
      it('does not return a falsy value', () => {
        const result = settings.files()
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
      settings.getProjectPaths = () => { return [project] }
      filepath = path.join(folder, '.go.json')
      fs.writeFileSync(filepath, '{}')
    })

    describe('files', () => {
      it('does not return a falsy value', () => {
        const result = settings.files()
        expect(result).toBeTruthy()
        expect(result.length).toBeGreaterThan(0)
      })
    })
  })
})
