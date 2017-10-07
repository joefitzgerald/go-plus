'use babel'

import {CompositeDisposable} from 'atom'
import {buildGuruArchive, computeArgs} from './../guru-utils'
import {parseGoPosition, isValidEditor, getEditor} from './../utils'
import os from 'os'

class Usage {
  constructor (goconfig) {
    this.key = 'usage'
    this.tab = {
      name: 'Usage',
      packageName: 'go-plus',
      icon: 'telescope',
      order: 400,
      suppressPadding: true
    }
    this.subscriptions = new CompositeDisposable()
    this.goconfig = goconfig
    this.subscribeToCommands()
  }

  dispose () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    this.goconfig = null
  }

  subscribeToCommands () {
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'golang:find-usage': () => {
        if (isValidEditor(getEditor()) && this.goconfig && this.goconfig.locator) {
          this.exec(computeArgs('referrers', {}))
        }
      }
    }))
  }

  parseStream (jsonStream) {
    if (!jsonStream || !jsonStream.length) {
      return []
    }
    // A JSON stream is invalid json; characterized by a concatenation of
    // multiple JSON objects
    const r = new RegExp('^}$', 'igm')
    const result = []
    const objects = jsonStream.split(r)
    for (const obj of objects) {
      if (obj.trim() !== '') {
        result.push(JSON.parse(obj + '}'))
      }
    }
    return result
  }

  parse (obj) {
    if (!obj) {
      return undefined
    }

    if (obj.length < 2) {
      return undefined
    }

    const result = new Map()
    for (const pkg of obj.slice(1)) {
      if (!pkg || !pkg.refs || !pkg.refs.length) {
        continue
      }
      const refs = []
      for (const ref of pkg.refs) {
        const parsed = parseGoPosition(ref.pos)
        if (!parsed) {
          continue
        }
        refs.push({filename: parsed.file, row: parsed.line, column: parsed.column, text: ref.text})
      }
      result.set(pkg.package, refs)
    }

    return {initial: obj[0], packages: result}
  }

  updateContent (content, state) {
    let props = {}
    if (state === 'running' || state === 'error' || state === 'initial') {
      props.content = content
    } else {
      if (!content || !content.packages) {
        props.content = 'No usage found...'
      } else {
        props.content = {
          raw: content,
          referrers: content.packages
        }
      }
    }

    if (this.requestFocus) {
      this.requestFocus().then(() => {
        if (this.view) {
          this.view.update(props)
        }
      })
    }
  }

  exec (args) {
    if (!this.goconfig || !this.goconfig.executor) {
      return
    }
    this.updateContent('Running guru ' + args.join(' ') + '...', 'running')
    const options = {timeout: 30000}
    const archive = buildGuruArchive()
    if (archive && archive.length) {
      options.input = archive
      args.unshift('-modified')
    }
    return this.goconfig.locator.findTool('guru').then((cmd) => {
      if (!cmd) {
        return false
      }
      return this.goconfig.executor.exec(cmd, args, options).then((r) => {
        if (r.error || r.exitcode !== 0 || (r.stderr && r.stderr.trim() !== '')) {
          var message
          if (r.exitcode === 124) {
            message = `operation timed out after ${options.timeout} ms`
          } else {
            message = r.message + os.EOL + r.stderr.trim() + os.EOL + r.stdout.trim()
          }
          const content = 'guru failed:' + os.EOL + message
          this.updateContent(content, 'error')
          return false
        }

        this.updateContent(this.parse(this.parseStream(r.stdout)), 'success')
        return true
      })
    })
  }
}

export {Usage}
