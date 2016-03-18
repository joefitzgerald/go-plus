'use babel'
/* eslint-env jasmine */

describe('go-plus', () => {
  let mainModule = null

  beforeEach(() => {
    waitsForPromise(() => {
      return atom.packages.activatePackage('go-plus').then((pack) => {
        mainModule = pack.mainModule
        return
      })
    })
  })

  describe('when the go-plus package is activated', () => {
    it('activates successfully', () => {
      expect(mainModule).toBeDefined()
      expect(mainModule).toBeTruthy()
      expect(mainModule.activate).toBeDefined()
      expect(mainModule.deactivate).toBeDefined()
    })
  })
})
