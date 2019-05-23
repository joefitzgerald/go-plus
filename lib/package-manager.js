// @flow

import os from 'os'
import { CompositeDisposable } from 'atom'

import type { GoConfig } from './config/service'
import type { GoGet } from './get/service'
import type { ToolChecker } from './tool-checker'

const bundledPackages = new Map([
  [
    'go-debug',
    'Allows you to interactively debug your go program and tests using delve.'
  ],
  ['atom-ide-ui', 'Provides IDE features and displays diagnostic messages.']
])

const goTools = new Map([
  ['gopls', 'golang.org/x/tools/cmd/gopls'],
  ['revive', 'github.com/mgechev/revive'],
  ['gogetdoc', 'github.com/zmb3/gogetdoc'],
  ['golangci-lint', 'github.com/golangci/golangci-lint/cmd/golangci-lint'],
  ['goimports', 'golang.org/x/tools/cmd/goimports'],
  ['gorename', 'golang.org/x/tools/cmd/gorename'],
  ['goreturns', 'github.com/sqs/goreturns'],
  ['goaddimport', 'github.com/zmb3/goaddimport'],
  ['guru', 'golang.org/x/tools/cmd/guru'],
  ['gomodifytags', 'github.com/fatih/gomodifytags'],
  ['gopkgs', 'github.com/tpng/gopkgs']
])

class PackageManager {
  goconfig: GoConfig
  goget: GoGet
  willInstall: boolean
  loaded: boolean
  subscriptions: CompositeDisposable
  toolChecker: ToolChecker

  constructor(goconfig: GoConfig, goget: GoGet) {
    this.loaded = false
    this.goconfig = goconfig
    this.goget = goget
    this.subscriptions = new CompositeDisposable()
    if (atom.config.get('go-plus.disableToolCheck')) {
      this.loaded = true
      return
    }
    this.registerTools()
    const { ToolChecker } = require('./tool-checker')
    if (!this.toolChecker) {
      this.toolChecker = new ToolChecker(this.goconfig)
    }
    this.toolChecker.checkForTools(Array.from(goTools.keys()))
    this.willInstall = true
    this.loaded = true
    setTimeout(() => {
      if (!this.willInstall) {
        return
      }
      this.installBundledPackages()
    }, 5000)
  }

  dispose() {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.loaded = false
    this.willInstall = true
  }

  async installBundledPackages() {
    let packages = new Map()
    for (const [pkg, detail] of bundledPackages) {
      const p = atom.packages.getLoadedPackage(pkg)
      if (p) {
        continue
      }

      let disabled = false
      const disabledPackages = atom.config.get(
        'go-plus.disabledBundledPackages'
      )
      if (Array.isArray(disabledPackages)) {
        for (const d of disabledPackages) {
          if (typeof d === 'string' && d.trim() === pkg) {
            disabled = true
            break
          }
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

    const pack = await atom.packages.activatePackage('settings-view')
    if (!pack) {
      return
    }
    const mainModule = pack.mainModule
    const settingsview = mainModule.createSettingsView({
      uri: pack.mainModule.configUri
    })
    const installPkg = pkg => {
      if (atom.packages.isPackageDisabled(pkg)) {
        atom.packages.enablePackage(pkg)
        return
      }
      console.log(`installing package ${pkg}`) // eslint-disable-line no-console
      settingsview.packageManager.install({ name: pkg }, error => {
        if (!error) {
          console.log(`the ${pkg} package has been installed`) // eslint-disable-line no-console
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
        }
      })
    }
    for (const [pkg, detail] of packages) {
      const notification = atom.notifications.addInfo('go-plus', {
        dismissable: true,
        icon: 'cloud-download',
        detail:
          `Additional features are available via the ${pkg} package. ` + detail,
        description: `Would you like to install/activate ${pkg} ?`,
        buttons: [
          {
            text: 'Yes',
            onDidClick: () => {
              notification.dismiss()
              installPkg(pkg)
            }
          },
          {
            text: 'Not Now',
            onDidClick: () => {
              notification.dismiss()
            }
          },
          {
            text: 'Never',
            onDidClick: () => {
              notification.dismiss()
              const disabledBundledPackages = atom.config.get(
                'go-plus.disabledBundledPackages'
              )
              if (
                Array.isArray(disabledBundledPackages) &&
                !disabledBundledPackages.includes('pkg')
              ) {
                disabledBundledPackages.push(pkg)
                atom.config.set(
                  'go-plus.disabledBundledPackages',
                  disabledBundledPackages
                )
              }
            }
          }
        ]
      })
    }
  }

  async registerTools() {
    if (!this.goget || !this.subscriptions) {
      return
    }
    for (const [, value] of goTools) {
      const packagePath = value
      this.subscriptions.add(this.goget.register(packagePath))
    }
  }
}

export { PackageManager }
