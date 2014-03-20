# go-plus – Improved Go Experience In Atom

This package adds the following functionality to the go language:

* `gofmt` support
* `goimports` support (change the `Gofmt Path` preference to target `goimports`)
* `go vet` support

### Defaults

The preferences for this package default to values that match the way `go` is
installed on OS X using the package installer:

* `go` is installed at `/usr/local/go`
* `go` executables are found at `/usr/local/go/bin`

Additionally `format on save` and `vet on save` are enabled default. You can
override these defaults by updating the `go-plus` preferences.

The following features will be added soon:

* `go build` and `go test` integration to enhance error display
* Status bar text for errors
* `gocode` integration
* ... and others: https://github.com/joefitzgerald/go-plus/issues

### Contributing

Contributions are greatly appreciated. Please fork this repository, make your
changes, and open a pull request.
