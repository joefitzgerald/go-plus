# go-plus – Improved Go Experience In Atom

[![Build Status](https://travis-ci.org/joefitzgerald/go-plus.svg?branch=master)](https://travis-ci.org/joefitzgerald/go-plus)

You can install `go-plus` by opening Atom, going to `Preferences` > `Packages`, and searching for `go-plus`. Alternatively, run `apm install go-plus` in your terminal.

This package adds extra Atom functionality for the go language:

* Formatting source using `gofmt`
* Formatting and managing imports using `goimports` (change the `Gofmt Path`
  preference to target `goimports`)
* Code quality inspection using `go vet`
* Linting using `golint`
* Syntax checking using `go build` and `go test`
* Display of test coverage using `go test -coverprofile`

### Example

![A screenshot of go-plus in action](http://cl.ly/image/392z2L0f0E41/go-plus-example.gif)

### Defaults

The preferences for this package default to values that match the way `go` is
installed on OS X using the package installer:

* `go` is installed at `/usr/local/go`
* `go` executables are found at `/usr/local/go/bin`

Additionally `format on save` and `vet on save` are enabled by default. `syntax
check on save`, `lint on save` and `run coverage on save` are disabled by default. You can override these defaults by
updating the `go-plus` preferences.

### GOPATH

Love it or hate it, `GOPATH` is very important in `go` land.

Syntax checking requires a valid `GOPATH` for the files you are checking. You
can set your `GOPATH` using one of two mechanisms:

* Using the environment: set the `$GOPATH` environment variable to the correct
  value
* Using `go-plus` preferences: set the `Go Path` preference

The environment (if set) is preferred over the `Go Path` preference by default.
You can change this by updating the `Environment Overrides Configuration`
preference.

The most common reason `GOPATH` might not be set in the environment is due to the
way OS X launches processes. When you launch Atom via processes created by
`launchd` (e.g. using Finder, the Dock, or Spotlight) it likely will not have
access to your `$GOPATH` if you set it in your shell initialization files (e.g.
`.bash_profile`, `.bashrc`, `.zshrc`, etc).

Consider launching Atom via your shell – using the Atom Shell Commands – where
Atom should inherit your environment. Alternatively, try one of the suggestions
at http://apple.stackexchange.com/a/87283 to set the `GOPATH` for processes
launched by `launchd` (and their children, which will include Atom).

Setting the `Go Path` preference will ensure that you have a sensible fallback
for GOPATH if you have launched Atom without the `$GOPATH` environment variable
set.

If both the `Go Path` preference and the `$GOPATH` environment variable are
empty, `go-plus` will display a warning and will not perform `go build` / `go
test` powered syntax checking.

### Planned Features

The following features will be added soon:

* `gocode` integration ([#2](https://github.com/joefitzgerald/go-plus/issues/2))
* `go oracle` / `godef` integration ([#11](https://github.com/joefitzgerald/go-plus/issues/11))
* `godoc` integration ([#12](https://github.com/joefitzgerald/go-plus/issues/12))
* ... and others: https://github.com/joefitzgerald/go-plus/issues

### Contributors

* Scott Barron [@rubyist](https://github.com/rubyist)
    * Gofmt integration (https://github.com/atom/language-go/pull/3)
    * Display test coverage (https://github.com/joefitzgerald/go-plus/pull/27)
* Matt Aimonetti [@mattetti](https://github.com/mattetti) - Syntax checking (https://github.com/atom/language-go/pull/11)

### Contributing

Contributions are greatly appreciated. Please fork this repository, make your
changes, and open a pull request. See [Contributing](https://github.com/joefitzgerald/go-plus/wiki/Contributing) for detailed instructions.
