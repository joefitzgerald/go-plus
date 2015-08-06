GoList = require('../lib/golist')

describe 'When theres more Windows newlines', ->
  it "Uses Windows newlines in the import", ->
    list = new GoList()
    txt = "some text\r\nmore text\r\nsome unix line\n"
    expect(list.getNewl(txt)).toEqual("\r\n")

describe 'When theres more Unix newlines', ->
  it "Uses Unix newlines in the import", ->
    list = new GoList()
    txt = "some text\nmore text\nsome unix line\r\n"
    expect(list.getNewl(txt)).toEqual("\n")

describe "When importing with no import line", ->
  it "it creates an import line", ->
    list = new GoList()
    txt = """package main
func main(){}
"""
    expect(list.getImport(txt, "fmt")).toEqual("""package main

import (
\t"fmt"
)
func main(){}
""")

describe "When importing with an import line", ->
  it "it creates an import list", ->
    list = new GoList()
    txt = """package main
import "fmt"
func main(){}
"""
    expect(list.getImport(txt, "bytes")).toEqual("""package main
import (
\t"fmt"
\t"bytes"
)
func main(){}
""")

describe "When importing with an import list", ->
  it "it creates another import list", ->
    list = new GoList()
    txt = """package main
import (
"fmt"; "os"
"bytes")
func main(){}
"""
    expect(list.getImport(txt, "io/ioutil")).toEqual("""package main
import (
\t"fmt"
\t"os"
\t"bytes"
\t"io/ioutil"
)
func main(){}
""")
