package main

import (
	"fmt"
	"log"
)

func SayHello(name string) *log.Logger {
	fmt.Printf("Hello, %s\n", name)
	return &log.Logger{}
}

func main() {

}
