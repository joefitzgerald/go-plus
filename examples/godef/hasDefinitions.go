package main

import "fmt"

var test = "test string"

type testStruct struct {
	x int
	y string
}

func main() {
	x := testStruct{}
	fmt.Printf("%s, struct is of type %T\ntest is %s", hello(), x, test)
}

func hello() string {
	return "Hello, 世界"
}
