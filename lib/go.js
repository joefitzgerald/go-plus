// @flow

import type { GoConfig } from './config/service'

let vendorSupported: ?boolean
export async function isVendorSupported(goconfig: GoConfig): Promise<boolean> {
  if (vendorSupported != null) {
    return vendorSupported
  }
  const runtime = await goconfig.locator.runtime()
  if (!runtime || !runtime.semver) {
    return goconfig.environment()['GO15VENDOREXPERIMENT'] !== '0'
  }
  const [major, minor] = runtime.semver.split('.').map(v => parseInt(v, 10))

  switch (major) {
    case 0:
      vendorSupported = false
      break
    case 1:
      vendorSupported =
        minor > 6 ||
        ((minor === 5 || minor === 6) &&
          goconfig.environment()['GO15VENDOREXPERIMENT'] !== '0')
      break
    default:
      vendorSupported = true
      break
  }
  return vendorSupported
}

const populatePackages = async (
  pkgs: Map<string, string[]>,
  goconfig: GoConfig
) => {
  const gopkgs = await goconfig.locator.findTool('gopkgs')
  if (!gopkgs) return

  const options = goconfig.executor.getOptions('project')
  const r = await goconfig.executor.exec(gopkgs, [], options)
  const stderr = r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr
  if (r.exitcode !== 0) {
    // eslint-disable-next-line no-console
    console.log(
      'go-plus: "gopkgs" returned the following errors:',
      stderr.trim() || `exitcode ${r.exitcode}`
    )
  }
  const data = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
  if (!data || !data.trim()) {
    return
  }
  if (!pkgs) {
    return
  }

  data
    .trim()
    .split('\n')
    .forEach(path => {
      if (!pkgs) {
        return
      }
      const name = path
        .trim()
        .split('/')
        .pop()
      const p = pkgs.get(name) || []
      pkgs.set(name, p.concat(path.trim()))
    })

  pkgs.forEach(p => {
    p.sort()
  })
}

// TODO: make this work for modules
let pkgs: ?Map<string, string[]>
export function allPackages(goconfig: GoConfig): Map<string, string[]> {
  if (pkgs) {
    return pkgs
  }
  pkgs = new Map()
  populatePackages(pkgs, goconfig)
  return pkgs
}
