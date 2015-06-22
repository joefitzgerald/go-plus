package main

import "fmt"

var (
	testvar1 = "test string"
	testvar2 int
)

type testStruct struct {
	x int
	y string
}

var testvar3 testStruct

func main() {
	testvar3 = testStruct{}
	fmt.Printf("%s, struct is of type %T\ntest is %s", hello(), testvar3, testvar1)
}

func hello() string {
	return "Hello, 世界"
}
