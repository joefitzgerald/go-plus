'use babel'
/* eslint-env jasmine */

describe('go-get', () => {
  let mainModule = null

  beforeEach(() => {
    atom.config.set('go-plus.disableToolCheck', true)
    let pack = atom.packages.loadPackage('go-plus')
    pack.activateNow()
    mainModule = pack.mainModule

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
