'use babel'
/* eslint-env jasmine */

import fs from 'fs-extra'
import path from 'path'
import { lifecycle } from './../spec-helpers'
import { it, fit, ffit, beforeEach, runs } from '../async-spec-helpers' // eslint-disable-line

describe('implements', () => {
  let impl
  let editor
  let gopath
  let source
  let target

  beforeEach(async () => {
    lifecycle.setup()

    gopath = fs.realpathSync(lifecycle.temp.mkdirSync('gopath-'))
    process.env.GOPATH = gopath

    source = path.join(__dirname, '..', 'fixtures', 'implements')
    target = path.join(gopath, 'src', 'implements')
    fs.copySync(source, target)
    await lifecycle.activatePackage()
    const { mainModule } = lifecycle
    mainModule.provideGoConfig()
    impl = mainModule.loadImplements()
    impl.view = {}
    impl.view.update = jasmine.createSpy('update')
    impl.requestFocus = jasmine
      .createSpy('requestFocus')
      .andReturn(Promise.resolve())

    editor = await atom.workspace.open(path.join(target, 'main.go'))
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  it('updates the view when invoking guru', async () => {
    await impl.handleCommand()
    expect(impl.view.update).toHaveBeenCalled()
  })

  it('updates the view when guru fails', async () => {
    await impl.handleCommand()
    expect(impl.view.update).toHaveBeenCalled()
    expect(impl.view.update.calls.length).toBe(2)

    const args0 = impl.view.update.calls[0].args[0]
    const args1 = impl.view.update.calls[1].args[0]
    expect(args0.startsWith('running guru')).toBe(true)
    expect(args1.startsWith('guru failed')).toBe(true)
  })

  it('updates the view when guru succeeds', async () => {
    editor.setCursorBufferPosition([4, 9])
    await impl.handleCommand()
    expect(impl.view.update).toHaveBeenCalled()
    expect(impl.view.update.calls.length).toBe(2)

    const args0 = impl.view.update.calls[0].args[0]
    const args1 = impl.view.update.calls[1].args[0]
    expect(args0.startsWith('running guru')).toBe(true)

    expect(typeof args1).toBe('object')
    expect(args1.type.kind).toBe('struct')
    expect(args1.type.name).toBe('implements.Impl')
    expect(args1.from.length).toBe(2)
    expect(args1.from[0].name).toBe('implements.Fooer')
    expect(args1.from[1].name).toBe('io.Reader')
  })
})
