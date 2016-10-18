# [go-plus](https://atom.io/packages/go-plus) [![Build Status](https://travis-ci.org/joefitzgerald/go-plus.svg?branch=master)](https://travis-ci.org/joefitzgerald/go-plus) [![Build status](https://ci.appveyor.com/api/projects/status/d0cekvaprt9wo1et/branch/master?svg=true)](https://ci.appveyor.com/project/joefitzgerald/go-plus/branch/master) [![Slack](https://img.shields.io/badge/atom_slack-%23go--plus-blue.svg?style=flat)](https://atom-slack.herokuapp.com) [![Slack](https://img.shields.io/badge/gophers_slack-%23go--plus-blue.svg?style=flat)](https://gophersinvite.herokuapp.com)

> An Improved [Go](https://www.golang.org) Experience For The [Atom Editor](https://atom.io)

* Github: https://github.com/joefitzgerald/go-plus
* Atom: https://atom.io/packages/go-plus

## Overview

This package includes the following functionality:

* Display information about your current go installation, by running `go version` and `go env`
* Format your code with `gofmt`, `goimports`, or `goreturns`; optionally run one of these tools on save of any `.go` file
* Run tests, display test output, and display test coverage using `go test -coverprofile`

This package adds extra functionality by installing the following additional packages:

* [autocomplete-go](https://atom.io/packages/autocomplete-go): Autocomplete using `gocode`
* [builder-go](https://atom.io/packages/builder-go): Run `go install .` and `go test -c -o {tempdir} .` to verify your code can compile and to keep gocode suggestions up to date
* [gometalinter-linter](https://atom.io/packages/gometalinter-linter): Run a variety of linters (e.g. `golint`, `vet`, `gotype`, etc.) against your code
* [navigator-go](https://atom.io/packages/navigator-go): Go to definition using `godef`
* [gorename](https://atom.io/packages/gorename): Rename the symbol under your cursor using `gorename`
* [go-debug](https://atom.io/packages/go-debug): Debug your package / tests using [`delve`](https://github.com/derekparker/delve)
* [godoc](https://atom.io/packages/godoc): Display documentation for identifiers in source code using [`gogetdoc`](https://github.com/zmb3/gogetdoc)

## Platforms

The package has CI for OS X, Windows and Ubuntu.

## Installing Missing Tools

If you are missing any required tools, you may be prompted to install them. You can also manually install the required tools in your terminal:

```
go get -u golang.org/x/tools/cmd/goimports
go get -u github.com/sqs/goreturns
go get -u golang.org/x/tools/cmd/cover
go get -u github.com/nsf/gocode
go get -u github.com/alecthomas/gometalinter
go get -u github.com/zmb3/gogetdoc
go get -u github.com/rogpeppe/godef
```

## Having Issues?

You can file any `go-plus` issues [here](https://github.com/joefitzgerald/go-plus/issues/new). You can optionally file an issue in a downstream repository for anything related to a bundled package:

* [`runtime detection`](https://github.com/joefitzgerald/go-config): [create issue](https://github.com/joefitzgerald/go-config/issues/new)
* [`autocompletion / gocode`](https://github.com/joefitzgerald/autocomplete-go): [create issue](https://github.com/joefitzgerald/autocomplete-go/issues/new)
* [`building`](https://github.com/joefitzgerald/builder-go): [create issue](https://github.com/joefitzgerald/builder-go/issues/new)
* [`linting / gometalinter`](https://github.com/joefitzgerald/gometalinter-linter): [create issue](https://github.com/joefitzgerald/gometalinter-linter/issues/new)
* [`go to definition / godef`](https://github.com/joefitzgerald/navigator-go): [create issue](https://github.com/joefitzgerald/navigator-go/issues/new)
* [`gorename`](https://github.com/zmb3/gorename): [create issue](https://github.com/zmb3/gorename/issues/new)
* [`go-debug`](https://github.com/lloiser/go-debug): [create issue](https://github.com/lloiser/go-debug/issues/new)
* [`godoc`](https://github.com/zmb3/godoc): [create issue](https://github.com/zmb3/godoc/issues/new)

## Maintainers
* Joe Fitzgerald ([@joefitzgerald](https://github.com/joefitzgerald))
* Zac Bergquist ([@zmb3](https://github.com/zmb3))
* Lukas Beranek ([@lloiser](https://github.com/lloiser))

## Contributors
A list of contributors can be found at https://github.com/joefitzgerald/go-plus/graphs/contributors. Thank you so much to everyone has contributed to the package :heart:. You are awesome!

## Contributing

Contributions are greatly appreciated. Please fork this repository, make your
changes, and open a pull request. See [Contributing](https://github.com/joefitzgerald/go-plus/wiki/Contributing) for detailed instructions.
