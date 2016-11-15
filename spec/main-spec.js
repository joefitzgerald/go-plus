'use babel'
/* eslint-env jasmine */

describe('go-plus', () => {
  let mainModule = null

  beforeEach(() => {
    let pack = atom.packages.loadPackage('go-plus')
    pack.activateNow()
    mainModule = pack.mainModule
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
