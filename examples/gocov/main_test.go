package main

import "testing"

func TestHello(t *testing.T) {
	result := Hello()
	if result != "Hello, 世界" {
		t.Errorf("Expected %s - got %s", "Hello, 世界", result)
	}
}
