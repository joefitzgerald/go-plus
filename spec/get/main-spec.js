'use babel'
/* eslint-env jasmine */

describe('go-get', () => {
  let mainModule = null

  beforeEach(() => {
    waitsForPromise(() => {
      return atom.packages.activatePackage('go-plus').then((pack) => {
        mainModule = pack.mainModule
      })
    })

    waitsFor(() => {
      return mainModule.getGoconfig()
    })
  })

  describe('when the go-get package is activated', () => {
    it('activates successfully', () => {
      expect(mainModule).toBeDefined()
      expect(mainModule).toBeTruthy()
      expect(mainModule.provideGoConfig).toBeDefined()
      expect(mainModule.getGoconfig).toBeDefined()
      expect(mainModule.getGoconfig()).toBeTruthy()
      expect(mainModule.provideGoConfig()).toBeTruthy()
    })
  })
})
