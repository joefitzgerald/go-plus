// @flow

import os from 'os'
import { CompositeDisposable } from 'atom'

import type { GoConfig } from './config/service'
import type { GoGet } from './get/service'
import type { ToolChecker } from './tool-checker'

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
  'go-config'
]

const bundledPackages = new Map([
  [
    'go-debug',
    'It allows you to interactively debug your go program and tests using delve.'
  ],
  [
    'go-signature-statusbar',
    'It shows function signature information in the status bar.'
  ],
  ['atom-ide-ui', 'It provides IDE features and displays diagnostic messages.']
])

const goTools = new Map([
  ['goimports', 'golang.org/x/tools/cmd/goimports'],
  ['gorename', 'golang.org/x/tools/cmd/gorename'],
  ['goreturns', 'github.com/sqs/goreturns'],
  ['gocode', 'github.com/stamblerre/gocode'],
  ['revive', 'github.com/mgechev/revive'],
  ['golangci-lint', 'github.com/golangci/golangci-lint/cmd/golangci-lint'],
  ['gogetdoc', 'github.com/zmb3/gogetdoc'],
  ['goaddimport', 'github.com/zmb3/goaddimport'],
  ['godef', 'github.com/rogpeppe/godef'],
  ['guru', 'golang.org/x/tools/cmd/guru'],
  ['gomodifytags', 'github.com/fatih/gomodifytags'],
  ['gopkgs', 'github.com/tpng/gopkgs'],
  ['go-outline', 'github.com/ramya-rao-a/go-outline']
])

class PackageManager {
  goconfig: GoConfig
  goget: GoGet
  willInstall: boolean
  willUninstall: boolean
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

  dispose() {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.loaded = false
    this.willUninstall = false
    this.willInstall = true
  }

  disableOldPackages() {
    for (const pkg of oldPackages) {
      const p = atom.packages.getLoadedPackage(pkg)
      if (!p) {
        continue
      }
      atom.packages.disablePackage(pkg)
    }
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

  async uninstallOldPackages() {
    // remove old packages that have been merged into go-plus
    for (const pkg of oldPackages) {
      const p = atom.packages.getLoadedPackage(pkg)
      if (!p) {
        continue
      }
      const pack = await atom.packages.activatePackage('settings-view')
      if (pack && pack.mainModule) {
        const settingsview = pack.mainModule.createSettingsView({
          uri: pack.mainModule.configUri
        })
        settingsview.packageManager.uninstall({ name: pkg }, error => {
          if (!error) {
            atom.notifications.addInfo(
              `Removed the ${pkg} package, which is now provided by go-plus`
            )
          } else {
            console.log(error) // eslint-disable-line no-console
          }
        })
      }
    }
  }

  async registerTools() {
    if (!this.goget || !this.subscriptions) {
      return
    }
    for (const [key, value] of goTools) {
      const packagePath = value
      if (key === 'gocode') {
        this.subscriptions.add(
          this.goget.register(packagePath, async (outcome, packs) => {
            if (!packs.includes(packagePath)) {
              return
            }
            const cmd = await this.goconfig.locator.findTool('gocode')
            if (!cmd) {
              return
            }
            const notification = atom.notifications.addInfo('gocode', {
              dismissable: true,
              icon: 'cloud-download',
              description:
                'Running `gocode close` to ensure a new gocode binary is used.'
            })
            const opt = this.goconfig.executor.getOptions('project')
            const r = await this.goconfig.executor.exec(cmd, ['close'], opt)
            notification.dismiss()
            const stdout =
              r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
            const stderr =
              r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr
            const detail = stdout + os.EOL + stderr

            if (r.exitcode !== 0) {
              atom.notifications.addWarning('gocode', {
                dismissable: true,
                icon: 'sync',
                detail: detail.trim()
              })
              return r
            }
            if (stderr && stderr.trim() !== '') {
              console.log('go-plus: (stderr) ' + stderr) // eslint-disable-line no-console
            }
            atom.notifications.addSuccess('gocode', {
              dismissable: true,
              icon: 'sync',
              detail: detail.trim(),
              description:
                'The `gocode` daemon has been closed to ensure you are using the latest `gocode` binary.'
            })
            return r
          })
        )
      } else {
        this.subscriptions.add(this.goget.register(packagePath))
      }
    }
  }
}

export { PackageManager }
