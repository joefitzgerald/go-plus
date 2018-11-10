package main

import (
	"encoding/json"
	"fmt"
	"go/build"
	"io/ioutil"
	"os"
	"path"
	"path/filepath"
	"runtime"
	"strings"
)

func main() {
	if len(os.Args) <= 1 {
		os.Exit(1)
	}

	command := os.Args[1]
	switch command {
	case "version":
		fmt.Printf("go version go1.99.1 %s/%s\n", runtime.GOOS, runtime.GOARCH)
		return
	case "get":
		if os.Args[2] == "-u" {
			get(os.Args[3])
		} else {
			get(os.Args[2])
		}
		return
	case "env":
		j := len(os.Args) == 3 && os.Args[2] == "-json"
		printEnv(j)
		return
	default:
		fmt.Println("unknown command", command)
		os.Exit(1)
	}
}

// get simulates `go get` for a command line tool.
// it writes a dummy file go $GOPATH/bin
func get(packagePath string) {
	if packagePath == "" {
		fmt.Println("no package path was supplied to go get")
		os.Exit(1)
	}

	paths := strings.Split(packagePath, "/")
	if len(paths) <= 1 {
		fmt.Println("invalid package path:" + packagePath)
		os.Exit(1)
	}
	p := paths[len(paths)-1]
	suffix := ""
	if runtime.GOOS == "windows" {
		suffix = ".exe"
	}

	gopath := os.Getenv("GOPATH")
	if gopath == "" {
		gopath = build.Default.GOPATH
	}

	bin := path.Join(gopath, "bin", p+suffix)
	if err := ioutil.WriteFile(bin, []byte("dummy file"), 0755); err != nil {
		fmt.Printf("couldnt write to %s: %v", bin, err)
		os.Exit(1)
	}
}

func printEnv(inJSON bool) {
	var m map[string]string
	json.Unmarshal([]byte(env), &m)

	m["GOPATH"] = os.Getenv("GOPATH")
	m["GORACE"] = os.Getenv("GORACE")
	if gr := os.Getenv("GOROOT"); gr != "" {
		m["GOROOT"] = gr
	}
	m["GOTOOLDIR"] = filepath.Join(m["GOROOT"], "pkg", "tool", runtime.GOOS+"_"+runtime.GOARCH)

	if inJSON {
		json.NewEncoder(os.Stdout).Encode(m)
		return
	}
	prefix := ""
	if m["GOOS"] == "windows" {
		prefix = "set "
	}
	for k, v := range m {
		fmt.Printf("%s%s=%s\n", prefix, k, v)
	}
}
