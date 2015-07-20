# [go-plus](https://atom.io/packages/go-plus) [![OSX Build Status](https://travis-ci.org/joefitzgerald/go-plus.svg?branch=master)](https://travis-ci.org/joefitzgerald/go-plus) [![Windows Build status](https://ci.appveyor.com/api/projects/status/d0cekvaprt9wo1et)](https://ci.appveyor.com/project/joefitzgerald/go-plus) [![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/joefitzgerald/go-plus?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
> An Improved [Go](https://www.golang.org) Experience For The [Atom Editor](https://atom.io)

* Github: https://github.com/joefitzgerald/go-plus
* Atom: https://atom.io/packages/go-plus

## Installing

1. Install `go-plus`: `apm install go-plus` or open Atom and go to `Preferences > Packages`, search for `go-plus`, and install it

## Overview

This package adds extra Atom functionality for the go language:

* Autocomplete using `gocode` (you _must_ have the `autocomplete-plus` package activated for this to work)
* Formatting source using `gofmt`, `goimports`, or `goreturns`
* Code quality inspection using `go vet`
* Linting using `golint`
* Syntax checking using `go build` and `go test`
* Display of test coverage using `go test -coverprofile`
* Go to definition using `godef`

## Example

![An example of go-plus in action](https://cloud.githubusercontent.com/assets/744740/8767613/68718e22-2e1f-11e5-9e3c-afe5c23792d7.gif)

## Platforms

The package is currently known to work on OS X, Windows (7+) and Ubuntu. CI jobs exist for OS X and Windows; Ubuntu CI is still in-progress.

## Configuration

### Defaults

| Display Name                            | Name                                        | Default     | Description                                                                                                                                                                                                                            |
|:----------------------------------------|:--------------------------------------------|:------------|:---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Environment Overrides Config            | `go-plus.environmentOverridesConfiguration` | `true`      | Use the environment's value for GOPATH (if set) instead of the configured value for GOPATH (below)                                                                                                                                     |
| GOPATH                                  | `go-plus.goPath`                            | `unset`     | You should set your GOPATH in the environment, and launch Atom using the `atom` command line tool; if you would like to set it explicitly, you can do so here (e.g. ~/go)                                                              |
| Go Installation Path                    | `go-plus.goInstallation`                    | `unset`     | You should not normally set this; if you have a non-standard go installation path and `go` is not available on your PATH, you can use this to configure the location to `go` (e.g. /usr/local/othergo/bin/go or c:\othergo\bin\go.exe) |
| Run Format Tool On Save                 | `go-plus.formatOnSave`                      | `true`      | Run the configured format tool each time a file is saved                                                                                                                                                                               |
| Format Tool                             | `go-plus.formatTool`                        | `goimports` | Choose one: goimports, goreturns, or gofmt                                                                                                                                                                                             |
| Format Arguments                        | `go-plus.formatArgs`                        | `-w -e`     | `-w` will always be used; you can specify additional arguments for the format tool if desired                                                                                                                                          |
| Run Lint Tool On Save                   | `go-plus.lintOnSave`                        | `true`      | Run `golint` each time a file is saved                                                                                                                                                                                                 |
| Lint Arguments                          | `go-plus.golintArgs`                        | `unset`     | Arguments to pass to `golint` (these are not usually needed)                                                                                                                                                                           |
| Run Coverage Tool On Save               | `go-plus.runCoverageOnSave`                 | `false`     | Run `go test -coverprofile` each time a file is saved                                                                                                                                                                                  |
| Run Syntax Check On Save                | `go-plus.syntaxCheckOnSave`                 | `true`      | Run `go build` / `go test` each time a file is saved                                                                                                                                                                                   |
| Run Vet Tool On Save                    | `go-plus.vetOnSave`                         | `true`      | Run `go vet` each time a file is saved                                                                                                                                                                                                 |
| Vet Arguments                           | `go-plus.vetArgs`                           | `unset`     | Arguments to pass to `go vet` (these are not usually needed)                                                                                                                                                                           |
| Automatically Get Missing Tools         | `go-plus.getMissingTools`                   | `true`      | Run `go get -u` to retrieve any tools that are required but not currently available in the go tool directory, the PATH, or your GOPATH                                                                                                 |
| Show Message Panel                      | `go-plus.showPanel`                         | `true`      | Show the go-plus message panel to provide information about issues with your source                                                                                                                                                    |
| Show Message Panel When No Issues Exist | `go-plus.showPanelWhenNoIssuesExist`        | `false`     | Show the go-plus message panel even when no issues exist                                                                                                                                                                               |

### Detection Of Your Go Installation

The package will search the following locations (in order) for a `go` executable:

* All directories specified in the PATH environment variable
* OS X: `/usr/local/go/bin` (package installer)
* OS X: `/usr/local/bin` (Homebrew)
* Windows: `C:\go\bin` (package installer)
* Windows: `C:\tools\go\bin` (Chocolatey)

If you have go installed somewhere else, and *not available on the path*, specify the full path to the go executable in the `Go Installation` preference.

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

If both the `Go Path` preference and the `$GOPATH` / `%GOPATH%` environment variable are
empty, `go-plus` will display a warning and will not perform `go build` / `go
test` powered syntax checking.

## Planned Features

The following features will be added soon:

* `godoc` integration ([#12](https://github.com/joefitzgerald/go-plus/issues/12))
* `gb` support
* go `vendor experiment` support
* `gorename` integration ([#174](https://github.com/joefitzgerald/go-plus/issues/174))
* ... and others: https://github.com/joefitzgerald/go-plus/issues

## Troubleshooting

### GOPATH

> <b>Question:</b> Why can't Atom see my GOPATH? I have set it and I see it in terminal?

> <b>Answer:</b> Did You Launch Atom Using The Shell Command?

(From Above):

The most common reason `GOPATH` might not be set in the environment on OS X is due to the way OS X launches processes. When you launch Atom via processes created by `launchd` (e.g. using Finder, the Dock, or Spotlight) it likely will not have access to your `$GOPATH` if you set it in your shell initialization files (e.g. `.bash_profile`, `.bashrc`, `.zshrc`, etc).

Consider launching Atom via your shell – using the Atom Shell Commands – where Atom should inherit your environment. Alternatively, try one of the suggestions at http://apple.stackexchange.com/a/87283 to set the `GOPATH` for processes launched by `launchd` (and their children, which will include Atom).

### Still Having Issues?

If you are having issues and the information above isn't helping, feel free to create an issue at https://github.com/joefitzgerald/go-plus/issues. When you create the issue, please be sure to paste the information from `Packages > Go Plus > Display Go Information` to help us form a response that is targeted to your situation. This looks something like:

```
Go: go1.3.3 darwin/amd64 (@/usr/local/bin/go)
GOPATH: /Users/jfitzgerald/go
Cover Tool: /usr/local/Cellar/go/1.3.3/libexec/pkg/tool/darwin_amd64/cover
Vet Tool: /usr/local/Cellar/go/1.3.3/libexec/pkg/tool/darwin_amd64/vet
Format Tool: /Users/jfitzgerald/go/bin/goimports
Lint Tool: /Users/jfitzgerald/go/bin/golint
Git: /usr/bin/git
PATH: /Users/jfitzgerald/go/bin:/usr/local/bin:/Users/jfitzgerald/.rbenv/shims:/usr/local/bin:/usr/local/sbin:/Users/jfitzgerald/go/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/MacGPG2/bin:/usr/texbin
Atom: 0.143.0 (darwin x64 14.0.0)
```

## Contributors

A list of contributors can be found at https://github.com/joefitzgerald/go-plus/graphs/contributors. Joe Fitzgerald ([@joefitzgerald](https://github.com/joefitzgerald)) is the maintainer of this project.

## Contributing

Contributions are greatly appreciated. Please fork this repository, make your
changes, and open a pull request. See [Contributing](https://github.com/joefitzgerald/go-plus/wiki/Contributing) for detailed instructions.
