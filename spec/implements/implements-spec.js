'use babel'
/* eslint-env jasmine */

import {lifecycle} from './../spec-helpers'
import Implements from './../../lib/implements/implements'

describe('implements', () => {
  let impl

  beforeEach(() => {
    runs(() => {
      lifecycle.setup()
      // setup gopath
    })

    waitsForPromise(() => {
      return lifecycle.activatePackage()
    })

    runs(() => {
      const {mainModule} = lifecycle
      mainModule.provideGoConfig()
      mainModule.loadImplements()
    })

    waitsFor(() => {
      impl = lifecycle.mainModule.implements
      return impl
    })
  })

  afterEach(() => {
    lifecycle.teardown()
  })

  describe('par', () => {

  })
})
