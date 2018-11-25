package main

import (
	"fmt"
	"io"
)

const (
	A = "a"
	B = "b"
	C = "c"
)

const Answer = 42

var r io.Reader

type Number int

type Fooer interface {
	Foo() Number
}

func (n Number) ToInt() int {
	return int(n)
}

type S struct {
	a string
	b io.Reader
}

func Hello() {
	fmt.Println("Hello")
}
