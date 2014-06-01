## v1.1.4 (May 31st, 2014)

* :bug: Fix issue preventing display of coverage (#34)

## v1.1.3 (May 24th, 2014)

* :bug: Fix duplicate message issue

## v1.1.2 (May 15th, 2014)

* :lipstick: Use path.normalize wherever possible to make Windows paths kinda sorta work (#29)

## v1.1.1 (May 15th, 2014)

* :dog: Ensure that holding ⌘-S doesn't cause weirdness (fixes #28)
* :bug: Ensure GOPATH warnings don't trigger for multi-element GOPATH (fixes #30)

## v1.1.0 (May 11th, 2014)

* :new: Test Coverage using `go test -coverprofile` via @rubyist (fixes #25, #27)

## v1.0.10 (May 2nd, 2014)

* :bug: Ensure test binary is cleaned up when hyphenated package import is used

## v1.0.9 (April 28th, 2014)

* :abc: Update examples, add documentation describing how to contribute (fixes #20)

## v1.0.8 (April 28th, 2014)

* :abc: Update examples, add golint example

## v1.0.7 (April 28th, 2014)

* :new: Warn when GOPATH is unset, is non-existent, or does not contain a `src` folder

## v1.0.6 (April 28th, 2014)

* :lipstick: Rename `FmtArgs` preference to `GoFmtArgs`

## v1.0.5 (April 26th, 2014)

* :new: Specify arbitrary arguments for `gofmt`, `goimports`, `golint`, `go vet`

## v1.0.4 (April 8th, 2014)

* :bug: Ensure that a `GOPATH` with multiple values is handled correctly
* :lipstick: Remove user-specific paths from tests (fixes #19)

## v1.0.3 (April 7th, 2014)

* :bug: Handle GOPATH with multiple entries (fixes #18)
* :lipstick: Replace `~` and `$HOME` in paths with appropriate value
* :lipstick: Enhance fix for #17 with patch to go (https://code.google.com/p/go/issues/detail?id=7724)

## v1.0.2 (April 7th, 2014)

* :lipstick: Redirect build output to temporary directory (fixes #17)

## v1.0.1 (April 7th, 2014)

* :lipstick: Disable display of panel and 'No Issues' by default, but allow it to be turned on (fixes #16)

## v1.0.0 (April 6th, 2014)

* :new: Use [atom-message-panel](https://github.com/tcarlsen/atom-message-panel) for error display (fixes #3, #14)
* :new: It is now possible to use the `$GOPATH` variable in both `Gofmt Path` (e.g. `$GOPATH/bin/goimports`) and `Golint Path` (e.g. `$GOPATH/bin/golint`) (fixes #13)
* :lipstick: Remove redundant code, ensure we don't trigger for views which are not EditorViews
* :lipstick: Show an error if `Go Executable Path`, `Gofmt Path`, or `Golint Path` cannot be found

## v0.7.3 (April 3rd, 2014)

* :bug: Ensure `go build` syntax checking compiles the entire package (fixes #10)

## v0.7.2 (April 2nd, 2014)

* :bug: Suppress console errors if no file is open and a menu command is run

## v0.7.1 (April 2nd, 2014)

* :bug: Fixed menu commands so that you can run commands individually

## v0.7.0 (April 2nd, 2014)

* :new: Add `golint` Support (fixes #7)

## v0.6.0 (April 1st, 2014)

* :new: Syntax checking using `go build` and `go test` – in both cases, any output will be automatically cleaned up (fixes #1)
* :lipstick: Clean up logging
* :lipstick: Emit events so that external actors (e.g. tests, or other package authors) may trigger actions based on go-plus lifecycle events
* :lipstick: Tests for errors
* :bug: Fixed issue where vet support would not work if format on save was not enabled (fixes #8)

## v0.5.2 (March 20th, 2014)

* :abc: Add examples and demo gif

## v0.5.1 (March 19th, 2014)

* :abc: Update README and package metadata

## v0.5.0 (March 19th, 2014)

* :new: `go vet` support (fixes #5)
* :lipstick: Ensure errors are sorted by line number
* :lipstick: Ensure duplicate errors are excluded
* :lipstick: Ensure error pane is removed when tabs are changed

## v0.4.0 (Initial Release - March 13th, 2014)

* :new: `gofmt` and `goimports` support
