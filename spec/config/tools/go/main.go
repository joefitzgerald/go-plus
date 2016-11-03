package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

func main() {
	if len(os.Args) <= 1 {
		os.Exit(1)
	}

	command := os.Args[1]
	if command != "env" && command != "version" && command != "printjson" {
		fmt.Println("unknown argument " + os.Args[1])
		os.Exit(1)
	}

	g := readGo()

	if command == "version" {
		fmt.Printf("go version %s %s/%s\n", g.VERSION, g.GOOS, g.GOARCH)
		os.Exit(0)
	}

	if command == "env" {
		printEnv(&g)
	}

	if command == "printjson" {
		b, err := json.MarshalIndent(g, "", "    ")
		if err != nil {
			printErr(err)
		}

		fmt.Println(string(b[:]))
		os.Exit(1)
	}
}

func readGo() Go {
	filename := os.Getenv("GOENVJSON")
	if filename == "" {
		filename = "go.json"
	}
	content, err := ioutil.ReadFile(filename)
	if err != nil {
		printErr(err)
	}
	var g Go
	err = json.Unmarshal(content, &g)
	if err != nil {
		printErr(err)
	}
	return g
}

func printEnv(g *Go) {
	goroot := os.Getenv("GOROOT")
	if goroot == "" {
		goroot = g.GOROOT
	}

	env := []envVar{
		{"GOARCH", g.GOARCH},
		{"GOBIN", g.GOBIN},
		{"GOEXE", g.GOEXE},
		{"GOHOSTARCH", g.GOHOSTARCH},
		{"GOHOSTOS", g.GOHOSTOS},
		{"GOOS", g.GOOS},
		{"GOPATH", os.Getenv("GOPATH")},
		{"GORACE", os.Getenv("GORACE")},
		{"GOROOT", goroot},
		{"GOTOOLDIR", filepath.Join(goroot, "pkg", "tool", runtime.GOOS+"_"+runtime.GOARCH)},
		{"GO15VENDOREXPERIMENT", os.Getenv("GO15VENDOREXPERIMENT")},
	}

	if g.GOOS != "plan9" {
		env = append(env, envVar{"CC", g.CC})
		env = append(env, envVar{"GOGCCFLAGS", g.GOGCCFLAGS})
		env = append(env, envVar{"CXX", g.CXX})
	}

	env = append(env, envVar{"CGO_ENABLED", g.CGOENABLED})

	for _, e := range env {
		switch g.GOOS {
		default:
			fmt.Printf("%s=\"%s\"\n", e.name, e.value)
		case "plan9":
			if strings.IndexByte(e.value, '\x00') < 0 {
				fmt.Printf("%s='%s'\n", e.name, strings.Replace(e.value, "'", "''", -1))
			} else {
				v := strings.Split(e.value, "\x00")
				fmt.Printf("%s=(", e.name)
				for x, s := range v {
					if x > 0 {
						fmt.Printf(" ")
					}
					fmt.Printf("%s", s)
				}
				fmt.Printf(")\n")
			}
		case "windows":
			fmt.Printf("set %s=%s\n", e.name, e.value)
		}
	}

	os.Exit(0)
}

func printErr(err error) {
	fmt.Println(err)
	os.Exit(1)
}

type envVar struct {
	name, value string
}

// Go describes a Go runtime
type Go struct {
	GOARCH     string
	GOBIN      string
	GOEXE      string
	GOHOSTARCH string
	GOHOSTOS   string
	GOOS       string
	GOROOT     string
	GOTOOLDIR  string
	CC         string
	GOGCCFLAGS string
	CXX        string
	CGOENABLED string `json:"CGO_ENABLED"`
	VERSION    string
}
