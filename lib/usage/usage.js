'use babel'

import {CompositeDisposable} from 'atom'
import {buildGuruArchive, computeArgs} from './../guru-utils'
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
    this.active = false
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
      'golang:find-usage': () => this.exec(computeArgs('referrers'))
    }))
  }

  isActive (active) {
    this.active = active
  }

  setOrientation (orientation) {
    this.orientation = orientation
  }

  commandIsValid (command) {
    return false
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
        const components = ref.pos.split(':')
        const filename = components[0]
        const row = components[1]
        const column = components[2]
        const text = ref.text
        refs.push({filename, row, column, text})
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
      const referrers = content.packages
      props.content = {
        raw: content,
        referrers: referrers
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
    return this.goconfig.executor.exec('guru', args, options).then((r) => {
      const message = r.message + os.EOL + r.stderr.trim() + os.EOL + r.stdout.trim()
      if (r.error) {
        this.updateContent('guru ' + args.join(' ') + '...', 'failed:' + os.EOL + message, 'error')
        return false
      }

      if (r.exitcode !== 0 || r.stderr && r.stderr.trim() !== '') {
        this.updateContent('guru ' + args.join(' ') + '...', 'failed:' + os.EOL + message, 'error')
        return false
      }

      this.updateContent(this.parse(this.parseStream(r.stdout)), 'success')
      return true
    })
  }
}

export {Usage}
