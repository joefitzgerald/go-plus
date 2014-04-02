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
* :bug: Fixed issue where vet support would not work if format on save was not enabled (#8)

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
