// @flow

import type {Suggestion, SuggestionType} from './provider'
import type {GoCodeSuggestion, SnippetMode} from './gocodeprovider'

type Options = {
  prefix: string,
  suffix: string,
  snippetMode: SnippetMode
}

type FuzzySuggestion = {
  ...Suggestion,
  fuzzyMatch?: string
}

type Snippet = {
  snippet: string,
  displayText: string
}

type GoParam = {
  isFunc: bool,
  name: string,
  identifier: string,
  type: GoType | string // eslint-disable-line no-use-before-define
}

type GoType = {
  isFunc: bool,
  name: string,
  args?: Array<GoParam>,
  returns?: Array<GoParam>
}

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
  const result: GoType = {
    isFunc: false,
    name: '',
    args: [],
    returns: []
  }
  if (!type || type.trim() === '') {
    return result
  }
  const match = matchFunc(type)
  if (!match[0]) {
    return {
      ...result,
      name: type
    }
  }

  const args = match[1]
  const returns = match[2]
  if (!args && !returns) {
    return {
      ...result,
      isFunc: true,
      name: type
    }
  }

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

    if (arg.startsWith('func')) {
      result.push({isFunc: true, name: arg, identifier: '', type: parseType(arg)})
      continue
    }
    if (!arg.includes(' ')) {
      result.push({isFunc: false, name: arg, identifier: '', type: arg})
      continue
    }

    const split = arg.split(' ')
    if (!split || split.length < 2) {
      continue
    }

    let identifier = split.shift()
    let type = split.join(' ')
    let isFunc = false
    if (type.startsWith('func')) {
      type = parseType(split.join(' '))
      isFunc = true
    }
    result.push({isFunc: isFunc, name: arg, identifier: identifier, type: type})
  }

  return result
}

export function upgradeSuggestion (suggestion: Suggestion, c: GoCodeSuggestion, options: Options): FuzzySuggestion {
  if (!c || !c.type || c.type === '' || !c.type.includes('func(')) {
    return {...suggestion}
  }
  const type = parseType(c.type)
  if (!type || !type.isFunc) {
    return {...suggestion, leftLabel: ''}
  }
  suggestion.leftLabel = ''
  if (type.returns && type.returns.length > 0) {
    if (type.returns.length === 1) {
      suggestion.leftLabel = type.returns[0].name
    } else {
      suggestion.leftLabel = '('
      for (const r of type.returns) {
        if (suggestion.leftLabel === '(') {
          suggestion.leftLabel = suggestion.leftLabel + r.name
        } else {
          suggestion.leftLabel = suggestion.leftLabel + ', ' + r.name
        }
      }
      suggestion.leftLabel = suggestion.leftLabel + ')'
    }
  }
  const res = generateSnippet(c.name, type, options)
  return {
    ...suggestion,
    snippet: res.snippet,
    displayText: res.displayText,
    fuzzyMatch: c.name
  }
}

export function funcSnippet (result: Snippet, snipCount: number, argCount: number, param: GoParam) {
  // Generate an anonymous func
  let identifier = param.identifier
  if (!identifier || !identifier.length) {
    identifier = 'arg' + argCount
  }
  snipCount = snipCount + 1
  result.snippet = result.snippet + '${' + snipCount + ':'
  result.snippet = result.snippet + 'func('
  result.displayText = result.displayText + 'func('
  let internalArgCount = 0
  let args = []
  if (typeof param.type !== 'string') {
    args = param.type.args || []
  }
  for (const arg of args) {
    internalArgCount = internalArgCount + 1
    if (internalArgCount !== 1) {
      result.snippet = result.snippet + ', '
      result.displayText = result.displayText + ', '
    }

    snipCount = snipCount + 1
    let argText = 'arg' + argCount + ''
    if (arg.identifier && arg.identifier.length > 0) {
      argText = arg.identifier + ''
    }
    result.snippet = result.snippet + '${' + snipCount + ':' + argText + '} '
    result.displayText = result.displayText + argText + ' '
    if (arg.isFunc) {
      const r = funcSnippet(result, snipCount, argCount, arg)
      result = r.result
      snipCount = r.snipCount
      argCount = r.argCount
    } else if (typeof arg.type === 'string') {
      let argType: string = arg.type
      const orig = argType
      if (argType.endsWith('{}')) {
        argType = argType.substring(0, argType.length - 1) + '\\}'
      }
      result.snippet = result.snippet + argType
      result.displayText = result.displayText + orig
    }
  }

  result.snippet = result.snippet + ')'
  result.displayText = result.displayText + ')'
  if (typeof param.type !== 'string') {
    const paramType: GoType = param.type
    if (paramType.returns && paramType.returns.length) {
      if (paramType.returns.length === 1) {
        if (paramType.returns[0].isFunc) {
          result.snippet = result.snippet + ' '
          result.displayText = result.displayText + ' '
          const r = funcSnippet(result, snipCount, argCount, paramType.returns[0])
          result = r.result
          snipCount = r.snipCount
          argCount = r.argCount
        } else if (typeof paramType.returns[0].type === 'string') {
          result.snippet = result.snippet + ' ' + paramType.returns[0].type
          if (result.snippet.endsWith('{}')) {
            result.snippet = result.snippet.substring(0, result.snippet.length - 1) + '\\}'
          }
          if (paramType.returns) {
            result.displayText = result.displayText + ' ' + paramType.returns[0].name
          }
        }
      } else {
        let returnCount = 0
        result.snippet = result.snippet + ' ('
        result.displayText = result.displayText + ' ('
        for (const returnItem of paramType.returns) {
          returnCount = returnCount + 1
          if (returnCount !== 1) {
            result.snippet = result.snippet + ', '
            result.displayText = result.displayText + ', '
          }
          if (typeof returnItem.type === 'string') {
            let returnType = returnItem.type
            if (returnType.endsWith('{}')) {
              returnType = returnType.substring(0, returnType.length - 1) + '\\}'
            }
            result.snippet = result.snippet + returnType
          }
          result.displayText = result.displayText + returnItem.name
        }
        result.snippet = result.snippet + ')'
        result.displayText = result.displayText + ')'
      }
    }
  }
  snipCount = snipCount + 1
  result.snippet = result.snippet + ' {\n\t$' + snipCount + '\n\\}}'
  return {
    result: result,
    snipCount: snipCount,
    argCount: argCount
  }
}

export function generateSnippet (name: string, type: ?GoType, options: Options): Snippet {
  let result = {
    snippet: name + '(',
    displayText: name + '('
  }

  if (!type) {
    result.snippet = result.snippet + ')$0'
    result.displayText = result.displayText + ')'
    return result
  }
  let snipCount = 0
  if (type.args && type.args.length) {
    for (let argCount = 0; argCount < type.args.length; argCount++) {
      const arg = type.args[argCount]

      // omit variadic arguments
      const generateArgSnippet = !(argCount === type.args.length - 1 && typeof arg.type === 'string' && arg.type.startsWith('...'))

      if (argCount !== 0) {
        if (generateArgSnippet) { result.snippet = result.snippet + ', ' }
        result.displayText = result.displayText + ', '
      }
      if (arg.isFunc) {
        const r = funcSnippet(result, snipCount, argCount, arg)
        result = r.result
        snipCount = r.snipCount
        argCount = r.argCount
      } else {
        let argText = arg.name
        if (options.snippetMode === 'name' && arg.identifier && arg.identifier.length) {
          argText = arg.identifier
        }
        if (argText.endsWith('{}')) {
          argText = argText.substring(0, argText.length - 1) + '\\}'
        }
        snipCount = snipCount + 1
        if (generateArgSnippet) { result.snippet = result.snippet + '${' + snipCount + ':' + argText + '}' }
        result.displayText = result.displayText + arg.name
      }
    }
  }
  result.snippet = result.snippet + ')$0'
  result.displayText = result.displayText + ')'
  if (options.snippetMode === 'none') {
    // user doesn't care about arg names/types
    result.snippet = name + '($1)$0'
  }
  return result
}

export function toSuggestions (candidates: GoCodeSuggestion[], options: Options) {
  const suggestions = []
  for (const c of candidates) {
    let suggestion: FuzzySuggestion = {
      replacementPrefix: options.prefix,
      leftLabel: c.type || c.class,
      type: translateType(c.class)
    }
    if (c.class === 'func' && (!options.suffix || options.suffix !== '(')) {
      suggestion = upgradeSuggestion(suggestion, c, options)
    } else {
      suggestion.text = c.name
      suggestion.fuzzyMatch = suggestion.text
    }
    if (suggestion.type === 'package') {
      suggestion.iconHTML = '<i class="icon-package"></i>'
    }
    suggestions.push(suggestion)
  }
  return suggestions
}
