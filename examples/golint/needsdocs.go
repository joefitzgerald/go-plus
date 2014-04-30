package main

import "fmt"

func main() {
	// fmt.Println("Hello, 世界") is so limiting... Let's use a function!
	fmt.Println(Hello())
}

func Hello() string {
	// I wonder if I need to document this?
	return "Hello, 世界"
}
