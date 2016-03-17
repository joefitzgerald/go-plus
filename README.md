# [go-plus](https://atom.io/packages/go-plus) [![Build Status](https://travis-ci.org/joefitzgerald/go-plus.svg?branch=master)](https://travis-ci.org/joefitzgerald/go-plus) [![Build status](https://ci.appveyor.com/api/projects/status/d0cekvaprt9wo1et/branch/master?svg=true)](https://ci.appveyor.com/project/joefitzgerald/go-plus/branch/master)

> An Improved [Go](https://www.golang.org) Experience For The [Atom Editor](https://atom.io)

* Github: https://github.com/joefitzgerald/go-plus
* Atom: https://atom.io/packages/go-plus

## Overview

This package adds extra functionality to Atom for the go language by installing the following packages:

* [autocomplete-go](https://atom.io/packages/autocomplete-go): Autocomplete using `gocode`
* [gofmt](https://atom.io/packages/gofmt): Formatting source using `gofmt`, `goimports`, or `goreturns`
* [gometalinter-linter](https://atom.io/packages/gometalinter-linter): Run a variety of linters (e.g. `golint`, `vet`, `gotype`, etc.) against your code
* [navigator-godef](https://atom.io/packages/navigator-godef): Go to definition using `godef`
* [tester-go](https://atom.io/packages/tester-go): Display test coverage using `go test -coverprofile`
* [gorename](https://atom.io/packages/gorename): Rename the symbol under your cursor using `gorename`

## Platforms

The package has CI for OS X, Windows and Ubuntu.

## Detection Of Your Go Installation

This package relies on [go-config](https://atom.io/packages/go-config) to detect your go installation(s), your `GOPATH`, and the location of your installed tools.

## Installing Missing Tools

If you are missing any required tools, you may be prompted by [go-get](https://atom.io/packages/go-get) to install them. You can also manually install the required tools in your terminal.

## Having Issues?

`go-plus` has evolved over time, and is now a collection of curated single-purpose packages. If you are having issues, please file an issue at the relevant repository:

* [`runtime detection`](https://github.com/joefitzgerald/go-config): [create issue](https://github.com/joefitzgerald/go-config/issues/new)
* [`autocompletion / gocode`](https://github.com/joefitzgerald/autocomplete-go): [create issue](https://github.com/joefitzgerald/autocomplete-go/issues/new)
* [`linting / gometalinter`](https://github.com/joefitzgerald/gometalinter-linter): [create issue](https://github.com/joefitzgerald/gometalinter-linter/issues/new)
* [`gofmt / goimports / goreturns`](https://github.com/joefitzgerald/gofmt): [create issue](https://github.com/joefitzgerald/gofmt/issues/new)
* [`go to definition / godef`](https://github.com/joefitzgerald/navigator-godef): [create issue](https://github.com/joefitzgerald/navigator-godef/issues/new)
* [`test coverage`](https://github.com/joefitzgerald/tester-go/issues/new)
* [`gorename`](https://github.com/zmb3/gorename): [create issue](https://github.com/zmb3/gorename/issues/new)

## Contributors
A list of contributors can be found at https://github.com/joefitzgerald/go-plus/graphs/contributors. Joe Fitzgerald ([@joefitzgerald](https://github.com/joefitzgerald)) is the maintainer of this project.

## Contributing

Contributions are greatly appreciated. Please fork this repository, make your
changes, and open a pull request. See [Contributing](https://github.com/joefitzgerald/go-plus/wiki/Contributing) for detailed instructions.
