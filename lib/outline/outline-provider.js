// @flow

import { buildGuruArchive } from '../guru-utils'
import type { GoConfig } from '../config/service'

type TokenKind =
  | 'keyword'
  | 'class-name'
  | 'constructor'
  | 'method'
  | 'param'
  | 'string'
  | 'whitespace'
  | 'plain'
  | 'type'

type TextToken = {
  kind: TokenKind,
  value: string
}

type TokenizedText = Array<TextToken>

type Outline = { outlineTrees: Array<OutlineTree> }

type OutlineTree = {
  icon?: string, // from atom$Octicon (that type's not allowed over rpc so we use string)
  kind?: OutlineTreeKind, // kind you can pass to the UI for theming

  // Must be one or the other. If both are present, tokenizedText is preferred.
  plainText?: string,
  tokenizedText?: TokenizedText,

  // If user has atom-ide-outline-view.nameOnly then representativeName is used instead.
  representativeName?: string,

  startPosition: atom$Point,
  endPosition?: atom$Point,
  landingPosition?: atom$Point,
  children: Array<OutlineTree>
}

type OutlineTreeKind =
  | 'file'
  | 'module'
  | 'namespace'
  | 'package'
  | 'class'
  | 'method'
  | 'property'
  | 'field'
  | 'constructor'
  | 'enum'
  | 'interface'
  | 'function'
  | 'variable'
  | 'constant'
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'

type GoOutlineRange = {
  start: number,
  end: number
}

type GoOutlineType = 'variable' | 'type' | 'import' | 'function' | 'package'

type GoOutlineDeclaration = {
  label: string,
  type: GoOutlineType,
  receiverType?: string,
  icon?: string,
  start: number,
  end: number,
  children?: GoOutlineDeclaration[],
  signature?: GoOutlineRange,
  comment?: GoOutlineRange
}

const toOutline = (
  editor: TextEditor,
  goOutline: Array<GoOutlineDeclaration>,
  results: Array<OutlineTree>
) => {
  goOutline.forEach(item => {
    let { label } = item
    let kind = item.type

    // omit '-' variable assignments
    if (label === '_' && kind === 'variable') return

    // distinguish methods from ordinary functions
    if (item.receiverType) {
      label = `(${item.receiverType}).${label}`
      kind = 'method'
    }

    // there isn't an atom-ide-ui icon for "import", so we'll use
    // 'file' for our top-level container and 'package' for imports
    if (kind === 'package') kind = 'file'
    if (kind === 'import') kind = 'package'

    // TODO: this assumes a character index === byte index
    const start = editor.getBuffer().positionForCharacterIndex(item.start - 1)
    const end = editor.getBuffer().positionForCharacterIndex(item.end - 1)

    const line = editor.lineTextForBufferRow(start.row)

    if (kind === 'type') {
      // distinguish between structs and interfaces
      if (line.includes('type')) {
        if (line.includes('interface')) kind = 'interface'
        if (line.includes('struct')) kind = 'class' // TODO: is there a better icon?
      }

      // TODO: what about other type definitions?  'type' is not valid..
    }

    // go-outline doesn't distinguish constants from variables,
    // but we can get _some_ constants by looking for const in the line
    // (this won't catch multiple constants in a single GenDecl, though)
    if (kind === 'variable' && line.includes('const')) {
      kind = 'constant'
    }

    const converted: OutlineTree = {
      kind: (kind: any),
      plainText: label,
      representativeName: label,
      startPosition: start,
      endPosition: end,
      children: []
    }
    results.push(converted)

    // recurse through children
    if (item.children && item.children.length) {
      toOutline(editor, item.children, converted.children)
    }
  })
}

export class OutlineProvider {
  goconfig: GoConfig
  cmd: string

  name = 'go-plus'
  priority = 2
  grammarScopes = ['go', 'source.go']
  updateOnEdit = false

  constructor(goconfig: GoConfig) {
    this.goconfig = goconfig
  }

  async getCmd(): Promise<?string> {
    if (this.cmd) return this.cmd

    const r = await this.goconfig.locator.findTool('go-outline')
    if (r) this.cmd = r

    return this.cmd
  }

  async getOutline(editor: TextEditor): Promise<?Outline> {
    const p = editor.getPath()
    if (!p) return null

    const cmd = await this.getCmd()
    if (!cmd) return null

    const options = {}
    options.timeout = 3000
    const args = ['-f', p]
    const archive = buildGuruArchive(editor)
    if (archive && archive.length) {
      args.push('-modified')
      options.input = archive
    }

    const r = await this.goconfig.executor.exec(cmd, args, options)
    if (r.exitcode !== 0) return null

    const stdout = typeof r.stdout === 'string' ? r.stdout : r.stdout.toString()
    const goOutlineResult = JSON.parse(stdout)

    const trees: Array<OutlineTree> = []
    toOutline(editor, goOutlineResult, trees)
    return { outlineTrees: trees }
  }
}
