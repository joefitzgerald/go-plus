package main

import (
	"fmt"
	"io"
	"os"
	"strings"
)

// Foo has a message.
type Foo struct {
	// Message is a test message.
	Message string
}

// ChangeMessage changes the Foo's message.
func (f *Foo) ChangeMessage(msg string) {
	f.Message = msg
}

func main() {
	fmt.Println("Hello, World")
	f := &Foo{"This is a test\n"}
	io.Copy(os.Stdout, strings.NewReader(f.Message))
	f.ChangeMessage("This is the new message\n")
}
