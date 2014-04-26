#!/bin/bash
set -o nounset
set -o errexit

mkdir -p .go
cd .go
[ ! -f go1.2.1.darwin-amd64-osx10.8.tar.gz ] && wget https://go.googlecode.com/files/go1.2.1.darwin-amd64-osx10.8.tar.gz
[ -d go ] && rm -rf go
tar zxf go1.2.1.darwin-amd64-osx10.8.tar.gz
cd go
GOROOT=`pwd`
echo "GOROOT=$GOROOT"
GOBIN="$GOROOT/bin"
echo "GOBIN=$GOBIN"
cd ..
[ -d gopath ] && rm -rf gopath
mkdir -p gopath
cd gopath
GOPATH=`pwd`
echo "GOPATH=$GOPATH"
GOROOT=$GOROOT GOPATH=$GOPATH "$GOBIN/go" get github.com/golang/lint/golint
GOROOT=$GOROOT GOPATH=$GOPATH "$GOBIN/go" get code.google.com/p/go.tools/cmd/goimports
