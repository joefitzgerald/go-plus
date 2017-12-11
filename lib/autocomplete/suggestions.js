// @flow

import type {Suggestion, SuggestionType} from './provider'
import type {GoCodeSuggestion, SnippetMode} from './gocodeprovider'

type Options = {|
  prefix: string,
  suffix: string,
  snippetMode: SnippetMode
|}

type Ctx = {|
  snipCount: number,
  argCount: number,
  snippetMode: SnippetMode
|}

type FuzzySuggestion = Suggestion & {
  fuzzyMatch?: string
}

type Snippet = {|
  snippet: string,
  displayText: string
|}

type GoParam = {|
  name: string,
  identifier: string,
  type: GoType // eslint-disable-line no-use-before-define
|}

type GoNonFuncType = {
  isFunc: false,
  name: string
}

type GoFuncType = {|
  isFunc: true,
  name: string,
  args: Array<GoParam>,
  returns: Array<GoParam>
|}

type GoType = GoNonFuncType | GoFuncType

export function translateType (type: string): SuggestionType {
  switch (type) {
    case 'func':
      return 'function'
    case 'package':
      return 'import'
    case 'var':
      return 'variable'
    case 'type':
      return 'type'
    case 'const':
      return 'constant'
    default:
      return 'value'
  }
}

export function matchFunc (type: string): [?string, ?string, ?string] {
  if (!type || !type.startsWith('func(')) {
    return [undefined, undefined, undefined]
  }

  let count = 0
  let args
  let returns
  let returnsStart = 0
  for (let i = 0; i < type.length; i++) {
    if (type[i] === '(') {
      count = count + 1
    }

    if (type[i] === ')') {
      count = count - 1
      if (count === 0) {
        args = type.substring('func('.length, i)
        returnsStart = i + ') '.length
        break
      }
    }
  }

  if (type.length > returnsStart) {
    if (type[returnsStart] === '(') {
      returns = type.substring(returnsStart + 1, type.length - 1)
    } else {
      returns = type.substring(returnsStart, type.length)
    }
  }

  return [type, args, returns]
}

export function parseType (type: string): GoType {
  if (!type || type.trim() === '') {
    return {
      isFunc: false,
      name: ''
    }
  }
  const match = matchFunc(type)
  if (!match[0]) {
    return {
      isFunc: false,
      name: type
    }
  }

  const args = match[1]
  const returns = match[2]
  return {
    isFunc: true,
    name: type,
    args: args ? parseParameters(args) : [],
    returns: returns ? parseParameters(returns) : []
  }
}

export function ensureNextArg (args: Array<string>): Array<string> {
  if (!args || args.length === 0) {
    return []
  }

  let arg = args[0]
  let hasFunc = false
  if (arg.includes('func(')) {
    hasFunc = true
  }
  if (!hasFunc) {
    return args
  }
  let start = 4
  if (!arg.startsWith('func(')) {
    let splitArg = arg.split(' ')
    if (!splitArg || splitArg.length < 2 || !splitArg[1].startsWith('func(')) {
      return args
    }
    start = splitArg[0].length + 5
  }

  const funcArg = args.join(', ')
  let end = 0
  let count = 0
  for (let i = start; i < funcArg.length; i++) {
    if (funcArg[i] === '(') {
      count = count + 1
    } else if (funcArg[i] === ')') {
      count = count - 1
      if (count === 0) {
        end = i + 1
        break
      }
    }
  }

  arg = funcArg.substring(0, end)
  if (arg.length === funcArg.length || !funcArg.substring(end + 2, funcArg.length).includes(', ')) {
    return [funcArg.trim()]
  }

  if (funcArg[end + 1] === '(') {
    for (let i = end + 1; i < funcArg.length; i++) {
      if (funcArg[i] === '(') {
        count = count + 1
      } else if (funcArg[i] === ')') {
        count = count - 1
        if (count === 0) {
          end = i + 1
          break
        }
      }
    }
  }

  arg = funcArg.substring(0, end)
  if (arg.length === funcArg.length || !funcArg.substring(end + 2, funcArg.length).includes(', ')) {
    return [funcArg.trim()]
  }

  for (let i = end; i < funcArg.length; i++) {
    if (funcArg[i] === ',') {
      arg = arg + funcArg.substring(end, i)
      end = i + 1
      break
    }
  }

  args = funcArg.substring(end + 1, funcArg.length).trim().split(', ')
  args.unshift(arg.trim())
  return args
}

export function parseParameters (p: string): Array<GoParam> {
  if (!p || p.trim() === '') {
    return []
  }
  let args: Array<string> = p.split(/, /)
  const result: Array<GoParam> = []
  let more = true
  while (more) {
    args = ensureNextArg(args)
    if (!args || args.length === 0) {
      more = false
      continue
    }
    const arg = args.shift()

    let type = parseType(arg)
    if (type.isFunc) {
      result.push({name: arg, identifier: '', type})
      continue
    }
    if (!arg.includes(' ')) {
      result.push({name: arg, identifier: '', type})
      continue
    }

    const split = arg.split(' ')
    if (!split || split.length < 2) {
      continue
    }

    let identifier = split.shift()
    type = parseType(split.join(' '))
    result.push({name: arg, identifier, type})
  }

  return result
}

export function upgradeToFuncSuggestion (ctx: Ctx, suggestion: Suggestion, c: GoCodeSuggestion): FuzzySuggestion {
  if (!c.type || !c.type.includes('func(')) {
    return {...suggestion}
  }
  const type = parseType(c.type)
  if (!type.isFunc) {
    return {...suggestion, leftLabel: ''}
  }

  let snippet, displayText

  if (c.class === 'type') {
    const r = funcSnippet(ctx, type)
    snippet = c.name + '(' + r.snippet + ')'
    displayText = c.name
  } else {
    const r = generateSnippet(ctx, c.name, type)
    snippet = r.snippet
    displayText = r.displayText

    suggestion.leftLabel = funcReturnSnippet(ctx, type).displayText
  }

  snippet += '$0'
  if (ctx.snippetMode === 'none') {
    // user doesn't care about arg names/types
    snippet = c.name + '($1)$0'
  }

  return {
    ...suggestion,
    snippet,
    displayText,
    fuzzyMatch: c.name
  }
}

export function funcSnippet (ctx: Ctx, type: GoFuncType): Snippet {
  const argSnippets = type.args.map(arg => funcArgSnippet(ctx, arg))

  let snippet = 'func(' + argSnippets.map(s => s.snippet).join(', ') + ')'
  let displayText = 'func(' + argSnippets.map(s => s.displayText).join(', ') + ')'

  const r = funcReturnSnippet(ctx, type)
  snippet += r.snippet ? ' ' + r.snippet : ''
  displayText += r.displayText ? ' ' + r.displayText : ''

  ctx.snipCount++
  snippet += ' {\n\t$' + ctx.snipCount + '\n\\}'

  return {snippet, displayText}
}

export function anonymousFuncSnippet (ctx: Ctx, type: GoFuncType): Snippet {
  // Generate an anonymous func
  ctx.snipCount++
  const snip = ctx.snipCount

  const r = funcSnippet(ctx, type)

  return {
    snippet: '${' + snip + ':' + r.snippet + '}',
    displayText: r.displayText
  }
}

export function funcArgSnippet (ctx: Ctx, param: GoParam): Snippet {
  let argText = ''
  if (param.identifier) {
    argText = param.identifier + ''
  } else {
    ctx.argCount++
    argText = 'arg' + ctx.argCount + ''
  }

  ctx.snipCount++
  let snippet = '${' + ctx.snipCount + ':' + argText + '} '
  let displayText = argText + ' '

  if (param.type.isFunc) {
    const r = anonymousFuncSnippet(ctx, param.type)
    snippet += r.snippet
    displayText += r.displayText
  } else {
    const {name} = param.type
    snippet += escapeCurlies(name)
    displayText += name
  }

  return {snippet, displayText}
}

export function funcReturnSnippet (ctx: Ctx, type: GoFuncType): Snippet {
  const results = type.returns.map(r => {
    return {
      snippet: escapeCurlies(r.type.name),
      displayText: r.name
    }
  })

  let snippet = results.map(r => r.snippet).join(', ')
  let displayText = results.map(r => r.displayText).join(', ')

  if (results.length > 1) {
    snippet = '(' + snippet + ')'
    displayText = '(' + displayText + ')'
  }
  return {snippet, displayText}
}

export function generateSnippet (ctx: Ctx, name: string, type: GoFuncType): Snippet {
  const results = type.args.map((arg, i) => {
    if (arg.type.isFunc) {
      return anonymousFuncSnippet(ctx, arg.type)
    }

    // omit variadic arguments
    const generateArgSnippet = !(i === type.args.length - 1 && arg.type.name.startsWith('...'))
    let snippet = null
    if (generateArgSnippet) {
      let argText = arg.name
      if (ctx.snippetMode === 'name' && arg.identifier) {
        argText = arg.identifier
      }
      argText = escapeCurlies(argText)
      ctx.snipCount++
      snippet = '${' + ctx.snipCount + ':' + argText + '}'
    }
    return {snippet, displayText: arg.name}
  })

  let snippet = results.map(r => r.snippet).filter(r => r !== null).join(', ')
  let displayText = results.map(r => r.displayText).join(', ')

  snippet = name + '(' + snippet + ')'
  displayText = name + '(' + displayText + ')'

  return {snippet, displayText}
}

export function toSuggestion (c: GoCodeSuggestion, options: Options): Suggestion {
  let suggestion: FuzzySuggestion = {
    replacementPrefix: options.prefix,
    leftLabel: c.type || c.class,
    type: translateType(c.class)
  }
  const isFuncType = c.class === 'func' || (c.class === 'type' && c.type.includes('func('))
  if (isFuncType && options.suffix !== '(') {
    const ctx: Ctx = {
      snipCount: 0,
      argCount: 0,
      snippetMode: options.snippetMode
    }
    suggestion = upgradeToFuncSuggestion(ctx, suggestion, c)
  } else {
    suggestion.text = c.name
    suggestion.fuzzyMatch = suggestion.text
  }
  if (suggestion.type === 'package') {
    suggestion.iconHTML = '<i class="icon-package"></i>'
  }
  return suggestion
}

export function toSuggestions (candidates: GoCodeSuggestion[], options: Options): Suggestion[] {
  return candidates.map(c => toSuggestion(c, options))
}

const regexCurly = /{}/g
function escapeCurlies (str: string): string {
  return str.replace(regexCurly, '{\\}')
}
