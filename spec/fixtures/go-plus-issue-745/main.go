package main

import (
	"fmt"
	"net/http"
)

func main() {
	fmt.Println(string(http.MethodGet))
}
