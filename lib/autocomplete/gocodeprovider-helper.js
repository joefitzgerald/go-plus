// @flow

import path from 'path'
import type {AtomPoint} from './provider'

const vendorString = '/vendor/'

export function wantedPackage (buffer: any, pos: AtomPoint) {
  // get the pkg the user tries to autocomplete from the current line
  const lineTillPos = buffer.getTextInRange([[pos.row, 0], pos])
  const matches = lineTillPos.match(/(\w+)\.$/)
  if (!matches) {
    return null
  }
  return matches[1]
}

export function addImport (buffer: any, pkg: string, offset: number) {
  // find the "package ..." statement
  let row = -1
  buffer.scan(/^package /, (result) => {
    row = result.row
    if (row === undefined && result.range && result.range.start) {
      row = result.range.start.row
    }
  })
  if (row === -1) {
    return null
  }

  const text = buffer.getText()

  // import the "pkg" right after the package statement
  const importStmt = `import "${pkg}"\n`
  const index = buffer.characterIndexForPosition([row + 1, 0])
  const newText = text.substr(0, index) + importStmt + text.substr(index)
  const newOffset = offset + importStmt.length
  return { text: newText, offset: newOffset }
}

export function getPackage (file: string, gopath: string, pkgs: string[], useVendor: boolean) {
  if (useVendor) {
    const dir = path.dirname(file)
    const workspace = getCurrentGoWorkspaceFromGOPATH(gopath, dir)
    const vendorPkgs = pkgs.filter((pkg) => pkg.lastIndexOf(vendorString) > 0)
    for (const vpkg of vendorPkgs) {
      const relativePath = getRelativePackagePath(dir, workspace, vpkg)
      if (relativePath) {
        return relativePath
      }
    }
  }

  // take the first non-vendor package
  return pkgs.find((pkg) => pkg.lastIndexOf(vendorString) === -1)
}

export function getRelativePackagePath (currentDir: string, currentWorkspace: string, pkg: string) {
  let magicVendorString = vendorString
  let vendorIndex = pkg.lastIndexOf(magicVendorString)
  if (vendorIndex === -1) {
    magicVendorString = 'vendor/'
    if (pkg.startsWith(magicVendorString)) {
      vendorIndex = 0
    }
  }
  // Check if current file and the vendor pkg belong to the same root project
  // If yes, then vendor pkg can be replaced with its relative path to the "vendor" folder
  // If not, then the vendor pkg should not be allowed to be imported.
  if (vendorIndex > -1) {
    let rootProjectForVendorPkg = path.join(currentWorkspace, pkg.substr(0, vendorIndex))
    let relativePathForVendorPkg = pkg.substring(vendorIndex + magicVendorString.length)

    if (relativePathForVendorPkg && currentDir.startsWith(rootProjectForVendorPkg)) {
      return relativePathForVendorPkg
    }
    return ''
  }

  return pkg
}

export function getCurrentGoWorkspaceFromGOPATH (gopath: string, currentDir: string) {
  let workspaces = gopath.split(path.delimiter)
  let currentWorkspace = ''

  // Find current workspace by checking if current file is
  // under any of the workspaces in $GOPATH
  for (let i = 0; i < workspaces.length; i++) {
    let possibleCurrentWorkspace = path.join(workspaces[i], 'src')
    if (currentDir.startsWith(possibleCurrentWorkspace)) {
      // In case of nested workspaces, (example: both /Users/me and /Users/me/src/a/b/c are in $GOPATH)
      // both parent & child workspace in the nested workspaces pair can make it inside the above if block
      // Therefore, the below check will take longer (more specific to current file) of the two
      if (possibleCurrentWorkspace.length > currentWorkspace.length) {
        currentWorkspace = possibleCurrentWorkspace
      }
    }
  }
  return currentWorkspace
}
