'use babel'

let vendorSupported
export function isVendorSupported (goconfig) {
  if (vendorSupported != null) {
    return Promise.resolve(vendorSupported)
  }
  return goconfig.locator.runtime().then((runtime) => {
    if (!runtime) {
      return goconfig.environment()['GO15VENDOREXPERIMENT'] !== '0'
    }
    const [major, minor] = runtime.semver.split('.')

    switch (major) {
      case 0:
        vendorSupported = false
        break
      case 1:
        vendorSupported = (minor > 6 || ((minor === 5 || minor === 6) && goconfig.environment()['GO15VENDOREXPERIMENT'] !== '0'))
        break
      default:
        vendorSupported = true
        break
    }
    return vendorSupported
  })
}

let pkgs
export function allPackages (goconfig) {
  if (pkgs) {
    return pkgs
  }
  pkgs = new Map()

  goconfig.locator.findTool('gopkgs').then((gopkgs) => {
    if (!gopkgs) {
      return
    }
    return goconfig.executor.exec(gopkgs, [], 'project').then((r) => {
      if (r.exitcode !== 0) {
        console.log('go-plus: "gopkgs" returned the following errors:', r.stderr.trim() || `exitcode ${r.exitcode}`)
      }

      r.stdout.trim()
        .split('\n')
        .forEach((path) => {
          const name = path.trim().split('/').pop()
          const p = pkgs.get(name) || []
          pkgs.set(name, p.concat(path.trim()))
        })

      pkgs.forEach((p) => {
        p.sort()
      })
    })
  })
  return pkgs
}
