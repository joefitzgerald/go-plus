package main

import "fmt"

var sausage testStruct

type testStruct struct {
	x int
	y string
}

var test = "test string"

func main() {
	sausage = testStruct{}
	fmt.Printf("%s, struct is of type %T\ntest is %s", hello(), sausage, test)
}

func hello() string {
	return "Hello, 世界"
}
