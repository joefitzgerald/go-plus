'use babel'
/* eslint-env jasmine */

describe('config', () => {
  let goplusMain = null

  beforeEach(() => {
    atom.config.set('go-plus.disableToolCheck', true)
    let pack = atom.packages.loadPackage('go-plus')
    pack.activateNow()
    goplusMain = pack.mainModule
  })

  describe('when the go-config package is activated', () => {
    it('manages subscriptions', () => {
      expect(goplusMain).toBeDefined()
      expect(goplusMain.subscriptions).toBeDefined()
      expect(goplusMain.subscriptions).toBeTruthy()
    })

    it('disposes correctly', () => {
      expect(goplusMain).toBeDefined()
      expect(goplusMain.subscriptions).toBeDefined()
      expect(goplusMain.subscriptions).toBeTruthy()
      goplusMain.getLocator()
      expect(goplusMain.locator).toBeDefined()
      expect(goplusMain.locator).toBeTruthy()

      goplusMain.dispose()
      expect(goplusMain.subscriptions).toBeFalsy()
      expect(goplusMain.locator).toBeFalsy()

      goplusMain.activate()
    })

    it('gets a Locator', () => {
      expect(goplusMain.getLocator).toBeDefined()
      let locator = goplusMain.getLocator()
      expect(locator).toBeDefined()
      expect(locator).toBeTruthy()
    })

    it('gets an executor', () => {
      expect(goplusMain.getExecutor).toBeDefined()
      let executor = goplusMain.getExecutor()
      expect(executor).toBeDefined()
      expect(executor).toBeTruthy()
    })

    it('provides a service', () => {
      expect(goplusMain.provideGoConfig).toBeDefined()
      let provider = goplusMain.provideGoConfig()
      expect(provider).toBeTruthy()
      expect(provider.executor).toBeTruthy()
      expect(provider.locator).toBeTruthy()
      expect(provider.locator.runtimes).toBeDefined()
      expect(provider.locator.runtime).toBeDefined()
      expect(provider.locator.gopath).toBeDefined()
      expect(provider.locator.findTool).toBeDefined()
      expect(provider.locator.runtimeCandidates).not.toBeDefined()
      expect(provider.environment()).toBeTruthy()
    })
  })
})
