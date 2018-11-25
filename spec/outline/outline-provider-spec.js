'use babel'
/* eslint-env jasmine */

import path from 'path'
import { OutlineProvider } from '../../lib/outline/outline-provider'
import { ConfigService } from '../../lib/config/service'
import { it, fit, ffit, beforeEach, runs } from '../async-spec-helpers' // eslint-disable-line

describe('Outline Provider', () => {
  let editor
  let provider
  let outline

  beforeEach(async () => {
    provider = new OutlineProvider(new ConfigService().provide())

    const p = path.join(__dirname, '..', 'fixtures', 'outline', 'outline.go')
    editor = await atom.workspace.open(p)

    outline = await provider.getOutline(editor)
  })

  it('returns an outline', () => {
    expect(outline).toBeDefined()
    expect(outline.outlineTrees).toBeDefined()
    expect(outline.outlineTrees.length).toEqual(1)
  })

  it('returns the file at the root of the outline', () => {
    const f = outline.outlineTrees[0]
    expect(f.kind).toEqual('file')
    expect(f.plainText).toEqual('main')
    expect(f.representativeName).toEqual('main')
    expect(f.startPosition.row).toEqual(0)
    expect(f.startPosition.column).toEqual(0)
    expect(f.children.length).toEqual(12)
  })

  it('returns packages for imports', () => {
    const f = outline.outlineTrees[0]
    const packages = f.children.filter(o => o.kind === 'package')
    expect(packages.length).toEqual(2)

    expect(packages[0].plainText).toEqual('"fmt"')
    expect(packages[0].startPosition.row).toEqual(3)
    expect(packages[0].startPosition.column).toEqual(1)
    expect(packages[0].endPosition.row).toEqual(3)
    expect(packages[0].endPosition.column).toEqual(6)

    expect(packages[1].plainText).toEqual('"io"')
    expect(packages[1].startPosition.row).toEqual(4)
    expect(packages[1].startPosition.column).toEqual(1)
    expect(packages[1].endPosition.row).toEqual(4)
    expect(packages[1].endPosition.column).toEqual(5)
  })

  it('identifies single-line constants', () => {
    const f = outline.outlineTrees[0]
    const consts = f.children.filter(o => o.plainText === 'Answer')
    expect(consts.length).toEqual(1)
    expect(consts[0].kind).toEqual('constant')
  })

  it('identifies interfaces', () => {
    const f = outline.outlineTrees[0]
    const ifaces = f.children.filter(o => o.kind === 'interface')
    expect(ifaces.length).toEqual(1)
    expect(ifaces[0].plainText).toEqual('Fooer')
    expect(ifaces[0].startPosition.row).toEqual(19)
    expect(ifaces[0].startPosition.column).toEqual(5)
    expect(ifaces[0].endPosition.row).toEqual(21)
    expect(ifaces[0].endPosition.column).toEqual(1)
  })

  it('identifies methods', () => {
    const f = outline.outlineTrees[0]
    const methods = f.children.filter(o => o.kind === 'method')
    expect(methods.length).toEqual(1)
    expect(methods[0].plainText).toEqual('(Number).ToInt')
  })

  it('identifies functions', () => {
    const f = outline.outlineTrees[0]
    const funcs = f.children.filter(o => o.kind === 'function')
    expect(funcs.length).toEqual(1)
    expect(funcs[0].plainText).toEqual('Hello')
  })

  it('identifies structs', () => {
    const f = outline.outlineTrees[0]
    const ss = f.children.filter(o => o.plainText === 'S')
    expect(ss.length).toEqual(1)
    const s = ss[0]
    expect(s.kind).toEqual('class')
  })

  it('identifies type definitions', () => {
    const f = outline.outlineTrees[0]
    const nums = f.children.filter(o => o.plainText === 'Number')
    expect(nums.length).toEqual(1)

    // TODO: there's no icon for type, so provide a custom icon here..
    expect(nums[0].kind).toEqual('type') // there's no icon for type
  })

  it('identifies variables', () => {
    const f = outline.outlineTrees[0]
    const rs = f.children.filter(o => o.plainText === 'r')
    expect(rs.length).toEqual(1)
    expect(rs[0].kind).toEqual('variable')
  })

  it('identifies constants/enums', () => {
    // go-outline doesn't provide this for us
    const f = outline.outlineTrees[0]
    const items = f.children.filter(o => ['A', 'B', 'C'].includes(o.plainText))
    expect(items.length).toEqual(3)

    // TODO: expect kind to be constant or enum instead
    items.forEach(i => expect(i.kind).toEqual('variable'))
  })

  it('handles multi-byte characters in the input file', () => {
    // TODO ...
  })
})
