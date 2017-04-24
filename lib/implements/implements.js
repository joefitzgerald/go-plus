'use babel'

import {CompositeDisposable} from 'atom'
import {parseGoPosition, isValidEditor, getEditor} from './../utils'
import {buildGuruArchive, computeArgs} from './../guru-utils'

export default class Implements {
  constructor (goconfig) {
    this.goconfig = goconfig
    this.active = false

    this.key = 'implements'
    this.tab = {
      name: 'Implements',
      packageName: 'go-plus',
      icon: 'tasklist',
      order: 450,
      suppressPadding: true
    }

    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'golang:implements': () => { this.handleCommand() }
    }))
  }

  handleCommand () {
    if (!this.goconfig || !this.goconfig.locator || !this.goconfig.executor) {
      return
    }
    const editor = getEditor()
    if (!isValidEditor(editor)) {
      return
    }
    const args = computeArgs('implements', {})
    this.runGuru(args)
  }

  runGuru (args) {
    const options = {timeout: 10000}
    const archive = buildGuruArchive()
    if (archive && archive.length) {
      options.input = archive
      args.unshift('-modified')
    }
    // TODO: updateContent('running guru...')
    console.log('running guru ' + args.join(' '))
    return this.goconfig.locator.findTool('guru').then((cmd) => {
      if (!cmd) {
        return false
      }
      return this.goconfig.executor.exec(cmd, args, options).then((r) => {
        if (r.error || r.exitcode !== 0 || (r.stderr && r.stderr.trim() !== '')) {
          // TODO update content failure
          return false
        }
        return JSON.parse(r.stdout)
      }).then((obj) => {
        if (this.requestFocus) {
          this.requestFocus().then(() => {
            if (this.view) {
              this.view.update(obj)
            }
          })
        }
      })
    })
  }

  parse (output) {
    const obj = JSON.parse(output)
    if (!obj.type) {
      return null
    }
    let title
    let results
    if (obj.to) {
      // query result contains implementations of an interface
      title = `${obj.type.kind} ${obj.type.name} is implemented by:`
      results = obj.to
    } else {
      // query result contains interfaces implemented by a type
      // TODO: handle from/fromptr (can both be populated?)
      return null
    }

    const refs = []
    for (const r of results) {
      const parsed = parseGoPosition(r.pos)
      if (!parsed) {
        continue
      }
      refs.push({
        filename: parsed.file,
        row: parsed.line,
        column: parsed.column,
        text: r.name
      })
    }
    return {title: title, refs: refs}
  }

  dispose () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
      this.subscriptions = null
    }
  }

  isActive (active) {
    this.active = active
  }

  setOrientation (orientation) {
    this.orientation = orientation
  }
}

// Example output of implements query on an interface
//
// <kind> ProductLister is implemented by <kind> type <name>
//
// {
// 	"type": {
// 		"name": "github.com/pivotalservices/recombinator.ProductLister",
// 		"pos": "/Users/zbergquist/src/github.com/pivotalservices/recombinator/product.go:27:6",
// 		"kind": "interface"
// 	},
// 	"to": [
// 		{
// 			"name": "*github.com/pivotalservices/recombinator/sfdc.productService",
// 			"pos": "/Users/zbergquist/src/github.com/pivotalservices/recombinator/sfdc/sfdc_product.go:39:6",
// 			"kind": "pointer"
// 		}
// 	]
// }

// Example output on a type:
//
// <kind> type <type> implements <type>
// (depending on from or fromptr)
//
// 	"type": {
// 		"name": "github.com/pivotalservices/recombinator/sql.productService",
// 		"pos": "/Users/zbergquist/src/github.com/pivotalservices/recombinator/sql/sql_product.go:24:6",
// 		"kind": "struct"
// 	},
// 	"fromptr": [
// 		{
// 			"name": "github.com/pivotalservices/recombinator.ProductFinder",
// 			"pos": "/Users/zbergquist/src/github.com/pivotalservices/recombinator/product.go:33:6",
// 			"kind": "interface"
// 		},
// 		{
// 			"name": "github.com/pivotalservices/recombinator.ProductQuerier",
// 			"pos": "/Users/zbergquist/src/github.com/pivotalservices/recombinator/product.go:38:6",
// 			"kind": "interface"
// 		},
// 		{
// 			"name": "github.com/pivotalservices/recombinator.ProductService",
// 			"pos": "/Users/zbergquist/src/github.com/pivotalservices/recombinator/product.go:55:6",
// 			"kind": "interface"
// 		},
// 		{
// 			"name": "github.com/pivotalservices/recombinator.ProductStorer",
// 			"pos": "/Users/zbergquist/src/github.com/pivotalservices/recombinator/product.go:43:6",
// 			"kind": "interface"
// 		}
// 	]
// }
