# [go-plus](https://atom.io/packages/go-plus) [![Build Status](https://travis-ci.org/joefitzgerald/go-plus.svg?branch=master)](https://travis-ci.org/joefitzgerald/go-plus) [![Build status](https://ci.appveyor.com/api/projects/status/d0cekvaprt9wo1et/branch/master?svg=true)](https://ci.appveyor.com/project/joefitzgerald/go-plus/branch/master) [![Slack](https://img.shields.io/badge/atom_slack-%23go--plus-blue.svg?style=flat)](https://atom-slack.herokuapp.com) [![Slack](https://img.shields.io/badge/gophers_slack-%23go--plus-blue.svg?style=flat)](https://gophersinvite.herokuapp.com)

[![Greenkeeper badge](https://badges.greenkeeper.io/joefitzgerald/go-plus.svg)](https://greenkeeper.io/)

> An Improved [Go](https://www.golang.org) Experience For The [Atom Editor](https://atom.io)

- Github: https://github.com/joefitzgerald/go-plus
- Atom: https://atom.io/packages/go-plus

## Overview

This package includes the following functionality:

- Display information about your current go installation, by running `go version` and `go env`
- Autocomplete using `gocode`
- Format your code with `gofmt`, `goimports`, or `goreturns`;
  optionally run one of these tools on save of any `.go` file
- Run `go install .` and `go test -c -o {tempdir} .` to verify your code compiles
  and to keep `gocode` suggestions up to date
- Run a variety of linters (e.g. `golint`, `vet`, etc.) against your code using `gometalinter`
- Run tests, display test output, and display test coverage using `go test -coverprofile`
- Display documentation for identifiers in source code using
  [`gogetdoc`](https://github.com/zmb3/gogetdoc)
- Rename the symbol under your cursor using `gorename`
- Go to definition using `guru` or `godef`
- Highlight occurrences of an identifier using `guru`
- Find usages of an identifier using `guru`

You can add debug functionality to Atom by installing the following package:

- [go-debug](https://atom.io/packages/go-debug): Debug your package / tests using [`delve`](https://github.com/derekparker/delve)

## Builds

### How Are The Builds Performed?

The following commands are run for the directory of the current file:

- `go install .` (for normal `.go` files)
- `go test -o {tmpdir} -c .` (for `_test.go` files)

### Why Are You Running `go install` Instead Of `go build`?

`gocode` (and a few other tools, like `gotype`) work on `.a` files (i.e. the package object archive), and the way to keep these up to date is to run `go install` periodically. This ensures your autocomplete suggestions are kept up to date without having to resort to `gocode set autobuild true` :tada:.

### But What About `gb`?

We are open to suggestions for detecting a package which is built with gb; please feel free to submit a pull request that detects a gb package without any explicit configuration and runs it.

## Platforms

The package has CI for OS X, Windows and Ubuntu.

## Installing Missing Tools

If you are missing any required tools, you may be prompted to install them. You can also manually install the required tools in your terminal:

```
go get -u golang.org/x/tools/cmd/goimports
go get -u golang.org/x/tools/cmd/gorename
go get -u github.com/sqs/goreturns
go get -u github.com/mdempsky/gocode
go get -u github.com/alecthomas/gometalinter
go get -u github.com/zmb3/gogetdoc
go get -u github.com/zmb3/goaddimport
go get -u github.com/rogpeppe/godef
go get -u golang.org/x/tools/cmd/guru
go get -u github.com/fatih/gomodifytags
go get -u github.com/tpng/gopkgs
```

## Having Issues?

Please consult the [FAQ](https://github.com/joefitzgerald/go-plus/wiki/FAQ) prior to [opening an issue](https://github.com/joefitzgerald/go-plus/issues/new): https://github.com/joefitzgerald/go-plus/wiki/FAQ

If you have an issue with debugging, file an issue with [`go-debug`](https://github.com/lloiser/go-debug) [here](https://github.com/lloiser/go-debug/issues/new).

## Maintainers

- Joe Fitzgerald ([@joefitzgerald](https://github.com/joefitzgerald))
- Zac Bergquist ([@zmb3](https://github.com/zmb3))
- Lukas Beranek ([@lloiser](https://github.com/lloiser))

## Contributors

A list of contributors can be found at https://github.com/joefitzgerald/go-plus/graphs/contributors. Thank you so much to everyone has contributed to the package :heart:. You are awesome!

## Contributing

Contributions are greatly appreciated. Please fork this repository, make your
changes, and open a pull request. See [Contributing](https://github.com/joefitzgerald/go-plus/wiki/Contributing) for detailed instructions.
