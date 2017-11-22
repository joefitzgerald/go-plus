'use babel'
/* eslint-env jasmine */

import path from 'path'
import fs from 'fs-extra'
import {lifecycle} from './../spec-helpers'

describe('gomodifytags', () => {
  let gopath = null
  let editor = null
  let gomodifytags = null
  let source = null
  let target = null

  beforeEach(() => {
    runs(() => {
      lifecycle.setup()

      gopath = fs.realpathSync(lifecycle.temp.mkdirSync('gopath-'))
      process.env.GOPATH = gopath
    })

    waitsForPromise(() => {
      return lifecycle.activatePackage()
    })

    runs(() => {
      const {mainModule} = lifecycle
      mainModule.provideGoConfig()
      mainModule.loadGoModifyTags()
    })

    waitsFor(() => {
      gomodifytags = lifecycle.mainModule.gomodifytags
      return gomodifytags
    })

    afterEach(() => {
      lifecycle.teardown()
    })
  })

  describe('when a file is open', () => {
    let tempfile
    beforeEach(() => {
      runs(() => {
        source = path.join(__dirname, '..', 'fixtures', 'gomodifytags')
        target = path.join(gopath, 'src', 'gomodifytags')
        fs.copySync(source, target)
        tempfile = path.join(target, 'foo.go')
      })

      waitsForPromise(() => {
        return atom.workspace.open(tempfile).then((e) => {
          editor = e
        })
      })
    })

    describe('argument builder', () => {
      let options

      beforeEach(() => {
        options = {
          tags: [{tag: 'xml', option: null}, {tag: 'bson', option: null}],
          transform: 'snakecase',
          sortTags: false
        }
      })

      it('includes the -file option', () => {
        const args = gomodifytags.buildArgs(editor, options, 'Add')
        expect(args.length).toBeGreaterThan(1)
        expect(args[0]).toBe('-file')
        expect(args[1]).toBe(tempfile)
      })

      it('defaults to json if no tags are specified', () => {
        editor.setCursorBufferPosition([4, 6])
        options.tags = []
        const args = gomodifytags.buildArgs(editor, options, 'Add')
        const i = args.indexOf('-add-tags')
        expect(i).not.toBe(-1)
        expect(args[i + 1]).toBe('json')
        expect(args.includes('-add-options')).toBe(false)
      })

      it('specifies tags correctly', () => {
        editor.setCursorBufferPosition([4, 6])
        const args = gomodifytags.buildArgs(editor, options, 'Add')
        const i = args.indexOf('-add-tags')
        expect(i).not.toBe(-1)
        expect(args[i + 1]).toBe('xml,bson')
      })

      it('uses the -offset flag if there is no selection', () => {
        editor.setCursorBufferPosition([4, 6])
        const args = gomodifytags.buildArgs(editor, options, 'Add')
        expect(args.length).toBeGreaterThan(3)
        expect(args[2]).toBe('-offset')
        expect(args[3]).toBe('54')
      })

      it('uses the -line flag when there is a selection', () => {
        editor.setSelectedBufferRange([[3, 2], [4, 6]])
        const args = gomodifytags.buildArgs(editor, options, 'Add')
        expect(args.length).toBeGreaterThan(3)
        expect(args[2]).toBe('-line')
        expect(args[3]).toBe('4,5')
      })

      it('uses the -modified flag when the buffer is modified', () => {
        editor.setCursorBufferPosition([4, 6])
        editor.insertNewlineBelow()
        expect(editor.isModified()).toBe(true)
        const args = gomodifytags.buildArgs(editor, options, 'Add')
        expect(args.includes('-modified')).toBe(true)
      })

      it('uses the -transform flag when camel case is specified', () => {
        options.transform = 'camelcase'
        editor.setCursorBufferPosition([4, 6])
        const args = gomodifytags.buildArgs(editor, options, 'Add')
        const i = args.indexOf('-transform')
        expect(i).not.toBe(-1)
        expect(args[i + 1]).toBe('camelcase')
      })

      it('uses the -sort flag when the sort option is enabled', () => {
        options.sortTags = true
        editor.setCursorBufferPosition([4, 6])
        const args = gomodifytags.buildArgs(editor, options, 'Add')
        expect(args.includes('-sort')).toBe(true)
      })

      it('includes the -add-options flag if options were specified for add', () => {
        editor.setCursorBufferPosition([4, 6])
        options.tags = [{tag: 'bson', option: 'omitempty'}, {tag: 'xml', option: 'foo'}]
        const args = gomodifytags.buildArgs(editor, options, 'Add')
        let i = args.indexOf('-add-tags')
        expect(i).not.toBe(-1)
        expect(args[i + 1]).toBe('bson,xml')

        i = args.indexOf('-add-options')
        expect(i).not.toBe(-1)
        expect(args[i + 1]).toBe('bson=omitempty,xml=foo')
      })

      it('uses the -clear-tags flag if no tags are specified for remove', () => {
        editor.setCursorBufferPosition([4, 6])
        options.tags = []
        const args = gomodifytags.buildArgs(editor, options, 'Remove')
        expect(args.includes('-clear-tags')).toBe(true)
      })

      it('includes the -remove-tags flag if no options are specified for remove', () => {
        editor.setCursorBufferPosition([4, 6])
        options.tags = [{tag: 'json', option: null}]
        const args = gomodifytags.buildArgs(editor, options, 'Remove')
        expect(args.includes('-remove-options')).toBe(false)
        const i = args.indexOf('-remove-tags')
        expect(i).not.toBe(-1)
        expect(args[i + 1]).toBe('json')
      })

      it('includes the -remove-options flag if options are specified for remove', () => {
        editor.setCursorBufferPosition([4, 6])
        options.tags = [{tag: 'json', option: 'omitempty'}]
        const args = gomodifytags.buildArgs(editor, options, 'Remove')
        expect(args.includes('-remove-tags')).toBe(false)
        const i = args.indexOf('-remove-options')
        expect(i).not.toBe(-1)
        expect(args[i + 1]).toBe('json=omitempty')
      })
    })

    describe('when modifying tags', () => {
      it('adds json tags with options', () => {
        let result = null
        let command = null

        runs(() => {
          editor.setCursorBufferPosition([4, 6])
        })

        waitsForPromise(() => {
          return lifecycle.mainModule.provideGoConfig().locator.findTool('gomodifytags').then((cmd) => {
            expect(cmd).toBeTruthy()
            command = cmd
          })
        })

        waitsForPromise(() => {
          return gomodifytags.modifyTags(editor, {
            tags: [{tag: 'json', option: 'omitempty'}],
            transform: 'snakecase',
            sortTags: false
          }, 'Add', command).then((r) => {
            result = r
          })
        })

        runs(() => {
          expect(result).toBeTruthy()
          expect(result.success).toBe(true)
          expect(result.result.stdout).toBe('package foo\n\ntype Bar struct {\n\tQuickBrownFox int    `json:"quick_brown_fox,omitempty"`\n\tLazyDog       string `json:"lazy_dog,omitempty"`\n}\n\n')
        })
      })

      it('returns an error if the cursor is not inside a struct declaration', () => {
        let result = null
        let command = null

        runs(() => {
          editor.setCursorBufferPosition([0, 2])
        })

        waitsForPromise(() => {
          return lifecycle.mainModule.provideGoConfig().locator.findTool('gomodifytags').then((cmd) => {
            expect(cmd).toBeTruthy()
            command = cmd
          })
        })

        waitsForPromise(() => {
          return gomodifytags.modifyTags(editor, {tags: []}, 'Add', command).then((r) => {
            result = r
          })
        })

        runs(() => {
          expect(result).toBeTruthy()
          expect(result.success).toBe(false)
        })
      })
    })
  })
})
