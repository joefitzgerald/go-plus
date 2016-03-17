'use babel'

export default {
  dependenciesInstalled: null,

  activate () {
    require('atom-package-deps').install('go-plus').then(() => {
      this.dependenciesInstalled = true
      return this.dependenciesInstalled
    }).catch((e) => {
      console.log(e)
    })
  },

  deactivate () {
    this.dependenciesInstalled = null
  }
}
