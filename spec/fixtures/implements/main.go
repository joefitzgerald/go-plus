package main

import "io"

type Impl struct{}

func (Impl) Read(p []byte) (n int, err error) {
	return 0, nil
}

func (Impl) Foo() error {
	return nil
}

type Fooer interface {
	Foo() error
}

func read(r io.Reader) {

}

func main() {
	i := Impl{}
	read(i)
}
