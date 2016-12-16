package main

import (
	"fmt"
	"os"
)

func main() {
	env := os.Environ()
	for _, item := range env {
		fmt.Println(item)
	}
}
