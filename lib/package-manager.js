'use babel'

import os from 'os'
import {CompositeDisposable} from 'atom'

const oldPackages = [
  'gofmt',
  'tester-go',
  'builder-go',
  'autocomplete-go',
  'godoc',
  'gorename',
  'go-hyperclick',
  'navigator-go',
  'go-get',
  'go-config',
  'gometalinter-linter'
]

const bundledPackages = new Map([
  ['hyperclick', 'It enables alt-click for go to definition, and shift-alt-click to return to the prior location.'],
  ['go-debug', 'It allows you to interactively debug your go program and tests using delve.'],
  ['go-signature-statusbar', 'It shows function signature information in the status bar.'],
  ['linter', 'It runs linters and displays lint results. Alternatively, you can use Facebook\'s Nuclide package instead of the linter package.']
])

const goTools = new Map([
  ['goimports', 'golang.org/x/tools/cmd/goimports'],
  ['gorename', 'golang.org/x/tools/cmd/gorename'],
  ['goreturns', 'github.com/sqs/goreturns'],
  ['gocode', 'github.com/nsf/gocode'],
  ['gometalinter', 'github.com/alecthomas/gometalinter'],
  ['gogetdoc', 'github.com/zmb3/gogetdoc'],
  ['godef', 'github.com/rogpeppe/godef'],
  ['guru', 'golang.org/x/tools/cmd/guru'],
  ['gomodifytags', 'github.com/fatih/gomodifytags']
])

class PackageManager {
  constructor (goconfig, goget) {
    this.loaded = false
    this.goconfig = goconfig
    this.goget = goget
    this.subscriptions = new CompositeDisposable()
    if (atom.config.get('go-plus.disableToolCheck')) {
      this.loaded = true
      return
    }
    this.registerTools()
    const {ToolChecker} = require('./tool-checker')
    if (!this.toolChecker) {
      this.toolChecker = new ToolChecker(this.goconfig)
      this.subscriptions.add(this.toolChecker)
    }
    this.toolChecker.checkForTools(Array.from(goTools.keys()))
    this.disableOldPackages()
    this.willUninstall = true
    this.willInstall = true
    this.loaded = true
    setTimeout(() => {
      if (!this.willUninstall) {
        return
      }
      this.uninstallOldPackages()
    }, 10000)
    setTimeout(() => {
      if (!this.willInstall) {
        return
      }
      this.installBundledPackages()
    }, 5000)
  }

  dispose () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    this.loaded = false
    this.willUninstall = false
    this.willInstall = true
    this.goconfig = null
    this.goget = null
    this.toolChecker = null
  }

  disableOldPackages () {
    for (const pkg of oldPackages) {
      const p = atom.packages.getLoadedPackage(pkg)
      if (!p) {
        continue
      }
      atom.packages.disablePackage(pkg)
    }
  }

  installBundledPackages () {
    let packages = new Map()
    for (const [pkg, detail] of bundledPackages) {
      const p = atom.packages.getLoadedPackage(pkg)
      if (p) {
        continue
      }

      let disabled = false
      for (const d of atom.config.get('go-plus.disabledBundledPackages')) {
        if (d && d.trim() === pkg) {
          disabled = true
        }
      }
      if (disabled) {
        continue
      }

      packages.set(pkg, detail)
    }

    if (!packages.size) {
      return
    }

    atom.packages.activatePackage('settings-view').then((pack) => {
      if (!pack || !pack.mainModule) {
        return
      }
      const settingsview = pack.mainModule.createSettingsView({uri: pack.mainModule.configUri})
      const installPkg = (pkg) => {
        console.log(`installing package ${pkg}`)
        settingsview.packageManager.install({name: pkg}, (error) => {
          if (!error) {
            console.log(`the ${pkg} package has been installed`)
            atom.notifications.addInfo(`Installed the ${pkg} package`)
          } else {
            let content = ''
            if (error.stdout) {
              content = error.stdout
            }
            if (error.stderr) {
              content = content + os.EOL + error.stderr
            }
            content = content.trim()
            atom.notifications.addError(content)
            console.log(error)
          }
        })
      }
      for (const [pkg, detail] of packages) {
        const notification = atom.notifications.addInfo('go-plus', {
          dismissable: true,
          icon: 'cloud-download',
          detail: 'Additional features are available via the ' + pkg + ' package. ' + detail,
          description: 'Would you like to install ' + pkg + '?',
          buttons: [{
            text: 'Yes',
            onDidClick: () => {
              notification.dismiss()
              installPkg(pkg)
            }
          }, {
            text: 'Not Now',
            onDidClick: () => {
              notification.dismiss()
            }
          }, {
            text: 'Never',
            onDidClick: () => {
              notification.dismiss()
              const disabledBundledPackages = atom.config.get('go-plus.disabledBundledPackages')
              if (!disabledBundledPackages.includes('pkg')) {
                disabledBundledPackages.push(pkg)
                atom.config.set('go-plus.disabledBundledPackages', disabledBundledPackages)
              }
            }
          }]
        })
      }
    })
  }

  uninstallOldPackages () {
    // remove old packages that have been merged into go-plus
    for (const pkg of oldPackages) {
      const p = atom.packages.getLoadedPackage(pkg)
      if (!p) {
        continue
      }
      console.log(`removing package ${pkg}`)
      atom.packages.activatePackage('settings-view').then((pack) => {
        if (pack && pack.mainModule) {
          const settingsview = pack.mainModule.createSettingsView({uri: pack.mainModule.configUri})
          settingsview.packageManager.uninstall({name: pkg}, (error) => {
            if (!error) {
              console.log(`the ${pkg} package has been uninstalled`)
              atom.notifications.addInfo(`Removed the ${pkg} package, which is now provided by go-plus`)
            } else {
              console.log(error)
            }
          })
        }
      })
    }
  }

  registerTools () {
    if (!this.goget || !this.subscriptions) {
      return
    }
    for (const [key, value] of goTools) {
      const packagePath = value
      if (key === 'gometalinter') {
        this.subscriptions.add(this.goget.register(packagePath, (outcome, packs) => {
          if (!packs.includes(packagePath)) {
            return
          }
          this.goconfig.locator.findTool('gometalinter').then((cmd) => {
            if (!cmd) {
              return
            }
            const notification = atom.notifications.addInfo('gometalinter', {
              dismissable: true,
              icon: 'cloud-download',
              description: 'Running `gometalinter --install` to install tools.'
            })
            return this.goconfig.executor.exec(cmd, ['--install'], 'project').then((r) => {
              notification.dismiss()
              const detail = r.stdout + os.EOL + r.stderr

              if (r.exitcode !== 0) {
                atom.notifications.addWarning('gometalinter', {
                  dismissable: true,
                  icon: 'cloud-download',
                  detail: detail.trim()
                })
                return r
              }
              if (r.stderr && r.stderr.trim() !== '') {
                console.log('go-plus: (stderr) ' + r.stderr)
              }
              atom.notifications.addSuccess('gometalinter', {
                dismissable: true,
                icon: 'cloud-download',
                detail: detail.trim(),
                description: 'The tools were installed.'
              })
              return r
            })
          })
        }))
      } else if (key === 'gocode') {
        this.subscriptions.add(this.goget.register(packagePath, (outcome, packs) => {
          if (!packs.includes(packagePath)) {
            return
          }
          this.goconfig.locator.findTool('gocode').then((cmd) => {
            if (!cmd) {
              return
            }
            const notification = atom.notifications.addInfo('gocode', {
              dismissable: true,
              icon: 'cloud-download',
              description: 'Running `gocode close` to ensure a new gocode binary is used.'
            })
            return this.goconfig.executor.exec(cmd, ['close'], 'project').then((r) => {
              notification.dismiss()
              const detail = r.stdout + os.EOL + r.stderr

              if (r.exitcode !== 0) {
                atom.notifications.addWarning('gocode', {
                  dismissable: true,
                  icon: 'sync',
                  detail: detail.trim()
                })
                return r
              }
              if (r.stderr && r.stderr.trim() !== '') {
                console.log('go-plus: (stderr) ' + r.stderr)
              }
              atom.notifications.addSuccess('gocode', {
                dismissable: true,
                icon: 'sync',
                detail: detail.trim(),
                description: 'The `gocode` daemon has been closed to ensure you are using the latest `gocode` binary.'
              })
              return r
            })
          })
        }))
      } else {
        this.subscriptions.add(this.goget.register(packagePath))
      }
    }
  }
}

export {PackageManager}
