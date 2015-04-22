path = require('path')
fs = require('fs-plus')
temp = require('temp').track()
_ = require('underscore-plus')
PathHelper = require('./util/pathhelper')
AtomConfig = require('./util/atomconfig')

describe 'build', ->
  [mainModule, editor, dispatch, secondEditor, thirdEditor, testEditor, directory, filePath, secondFilePath, thirdFilePath, testFilePath, oldGoPath, pathhelper] = []

  beforeEach ->
    atomconfig = new AtomConfig()
    pathhelper = new PathHelper()
    atomconfig.allfunctionalitydisabled()
    directory = temp.mkdirSync()
    oldGoPath = process.env.GOPATH
    oldGoPath = pathhelper.home() + path.sep + 'go' unless process.env.GOPATH?
    process.env['GOPATH'] = directory
    atom.project.setPaths(directory)
    jasmine.unspy(window, 'setTimeout')

  afterEach ->
    process.env['GOPATH'] = oldGoPath

  describe 'when syntax check on save is enabled', ->
    ready = false
    beforeEach ->
      atom.config.set('go-plus.goPath', directory)
      atom.config.set('go-plus.syntaxCheckOnSave', true)
      filePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'go-plus.go')
      testFilePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'go-plus_test.go')
      fs.writeFileSync(filePath, '')
      fs.writeFileSync(testFilePath, '')

      waitsForPromise ->
        atom.workspace.open(filePath).then((e) -> editor = e)

      waitsForPromise ->
        atom.workspace.open(testFilePath).then((e) -> testEditor = e)

      waitsForPromise ->
        atom.packages.activatePackage('language-go')

      waitsForPromise -> atom.packages.activatePackage('go-plus').then (g) ->
        mainModule = g.mainModule

      waitsFor ->
        mainModule.dispatch?.ready

      runs ->
        dispatch = mainModule.dispatch

    it 'displays errors for unused code', ->
      done = false
      runs ->
        fs.unlinkSync(testFilePath)
        buffer = editor.getBuffer()
        buffer.setText('package main\n\nimport "fmt"\n\nfunc main()  {\n42\nreturn\nfmt.Println("Unreachable...")}\n')
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.once 'dispatch-complete', ->
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe('package main\n\nimport "fmt"\n\nfunc main()  {\n42\nreturn\nfmt.Println("Unreachable...")}\n')
          expect(dispatch.messages?).toBe(true)
          expect(_.size(dispatch.messages)).toBe(1)
          expect(dispatch.messages[0]?.column).toBe(false)
          expect(dispatch.messages[0]?.line).toBe('6')
          expect(dispatch.messages[0]?.msg).toBe('42 evaluated but not used')
          done = true
        buffer.save()

      waitsFor ->
        done is true

    it 'displays errors for unused code in a test file', ->
      done = false
      runs ->
        fs.unlinkSync(filePath)
        testBuffer = testEditor.getBuffer()
        testBuffer.setText('package main\n\nimport "testing"\n\nfunc TestExample(t *testing.T) {\n\t42\n\tt.Error("Example Test")\n}')
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.once 'dispatch-complete', ->
          expect(fs.readFileSync(testFilePath, {encoding: 'utf8'})).toBe('package main\n\nimport "testing"\n\nfunc TestExample(t *testing.T) {\n\t42\n\tt.Error("Example Test")\n}')
          expect(dispatch.messages?).toBe(true)
          expect(_.size(dispatch.messages)).toBe(1)
          expect(dispatch.messages[0]?.column).toBe(false)
          expect(dispatch.messages[0]?.line).toBe('6')
          expect(dispatch.messages[0]?.msg).toBe('42 evaluated but not used')
          done = true
        testBuffer.save()

      waitsFor ->
        done is true

    it 'cleans up test file', ->
      done = false
      runs ->
        fs.unlinkSync(filePath)
        testBuffer = testEditor.getBuffer()
        testBuffer.setText('package main\n\nimport "testing"\n\nfunc TestExample(t *testing.T) {\n\tt.Error("Example Test")\n}')
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        go = dispatch.goexecutable.current()
        dispatch.once 'dispatch-complete', ->
          expect(fs.existsSync(path.join(directory, 'src', 'github.com', 'testuser', 'example', 'example.test' + go.exe))).toBe(false)
          done = true
        testBuffer.save()

      waitsFor ->
        done is true

    it "does not error when a file is saved that is missing the 'package ...' directive", ->
      done = false
      runs ->
        fs.unlinkSync(filePath)
        testBuffer = testEditor.getBuffer()
        testBuffer.setText("")
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.once 'dispatch-complete', ->
          expect(fs.readFileSync(testFilePath, {encoding: 'utf8'})).toBe('')
          expect(dispatch.messages?).toBe(true)
          expect(_.size(dispatch.messages)).toBe(1)
          expect(dispatch.messages[0]?.msg).toBe("expected 'package', found 'EOF'")
          done = true
        testBuffer.save()

      waitsFor ->
        done is true

  describe 'when working with multiple files', ->
    [buffer, secondBuffer, thirdBuffer, testBuffer, done] = []

    beforeEach ->
      buffer = null
      secondBuffer = null
      thirdBuffer = null
      testBuffer = null
      done = false
      atom.config.set('go-plus.goPath', directory)
      atom.config.set('go-plus.syntaxCheckOnSave', true)
      filePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'go-plus.go')
      secondFilePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'util', 'util.go')
      thirdFilePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'util', 'strings.go')
      testFilePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'go-plus_test.go')
      fs.writeFileSync(filePath, '')
      fs.writeFileSync(secondFilePath, '')
      fs.writeFileSync(thirdFilePath, '')
      fs.writeFileSync(testFilePath, '')

      waitsForPromise ->
        atom.workspace.open(filePath).then((e) -> editor = e)

      waitsForPromise ->
        atom.workspace.open(secondFilePath).then((e) -> secondEditor = e)

      waitsForPromise ->
        atom.workspace.open(thirdFilePath).then((e) -> thirdEditor = e)

      waitsForPromise ->
        atom.workspace.open(testFilePath).then((e) -> testEditor = e)

      waitsForPromise ->
        atom.packages.activatePackage('language-go')

      waitsForPromise -> atom.packages.activatePackage('go-plus').then (g) ->
        mainModule = g.mainModule

      waitsFor ->
        mainModule.dispatch?.ready

      runs ->
        dispatch = mainModule.dispatch

    it 'does not display errors for dependent functions spread across multiple files in the same package', ->
      runs ->
        fs.unlinkSync(testFilePath)
        buffer = editor.getBuffer()
        secondBuffer = secondEditor.getBuffer()
        thirdBuffer = thirdEditor.getBuffer()
        buffer.setText('package main\n\nimport "fmt"\nimport "github.com/testuser/example/util"\n\nfunc main() {\n\tfmt.Println("Hello, world!")\n\tutil.ProcessString("Hello, world!")\n}')
        secondBuffer.setText('package util\n\nimport "fmt"\n\n// ProcessString processes strings\nfunc ProcessString(text string) {\n\tfmt.Println("Processing...")\n\tfmt.Println(Stringify("Testing"))\n}')
        thirdBuffer.setText('package util\n\n// Stringify stringifies text\nfunc Stringify(text string) string {\n\treturn text + "-stringified"\n}')
        buffer.save()
        secondBuffer.save()
        thirdBuffer.save()

      waitsFor ->
        not buffer.isModified() and not secondBuffer.isModified() and not thirdBuffer.isModified()

      runs ->
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.once 'dispatch-complete', ->
          expect(fs.readFileSync(secondFilePath, {encoding: 'utf8'})).toBe('package util\n\nimport "fmt"\n\n// ProcessString processes strings\nfunc ProcessString(text string) {\n\tfmt.Println("Processing...")\n\tfmt.Println(Stringify("Testing"))\n}')
          expect(dispatch.messages?).toBe(true)
          expect(_.size(dispatch.messages)).toBe(0)
          done = true
        secondBuffer.save()

      waitsFor ->
        done is true

    it 'does display errors for errors in dependent functions spread across multiple files in the same package', ->
      runs ->
        fs.unlinkSync(testFilePath)
        buffer = editor.getBuffer()
        secondBuffer = secondEditor.getBuffer()
        thirdBuffer = thirdEditor.getBuffer()
        buffer.setText('package main\n\nimport "fmt"\nimport "github.com/testuser/example/util"\n\nfunc main() {\n\tfmt.Println("Hello, world!")\n\tutil.ProcessString("Hello, world!")\n}')
        secondBuffer.setText('package util\n\nimport "fmt"\n\n// ProcessString processes strings\nfunc ProcessString(text string) {\n\tfmt.Println("Processing...")\n\tfmt.Println(Stringify("Testing"))\n}')
        thirdBuffer.setText('package util\n\n// Stringify stringifies text\nfunc Stringify(text string) string {\n\t42\n\treturn text + "-stringified"\n}')
        buffer.save()
        secondBuffer.save()
        thirdBuffer.save()

      waitsFor ->
        not buffer.isModified() and not secondBuffer.isModified() and not thirdBuffer.isModified()

      runs ->
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.once 'dispatch-complete', ->
          expect(fs.readFileSync(secondFilePath, {encoding: 'utf8'})).toBe('package util\n\nimport "fmt"\n\n// ProcessString processes strings\nfunc ProcessString(text string) {\n\tfmt.Println("Processing...")\n\tfmt.Println(Stringify("Testing"))\n}')
          expect(dispatch.messages?).toBe(true)
          expect(_.size(dispatch.messages)).toBe(1)
          expect(dispatch.messages[0].file).toBe(thirdFilePath)
          expect(dispatch.messages[0].line).toBe('5')
          expect(dispatch.messages[0].msg).toBe('42 evaluated but not used')
          expect(dispatch.messages[0].type).toBe('error')
          expect(dispatch.messages[0].column).toBe(false)
          done = true
        secondBuffer.save()

      waitsFor ->
        done is true

    it 'displays errors for unused code in a file under test', ->
      runs ->
        fs.unlinkSync(filePath)
        secondBuffer = secondEditor.getBuffer()
        thirdBuffer = thirdEditor.getBuffer()
        testBuffer = testEditor.getBuffer()
        secondBuffer.setText('package util\n\nimport "fmt"\n\n// ProcessString processes strings\nfunc ProcessString(text string) {\n\tfmt.Println("Processing...")\n\tfmt.Println(Stringify("Testing"))\n}')
        thirdBuffer.setText('package util\n\n// Stringify stringifies text\nfunc Stringify(text string) string {\n\t42\n\treturn text + "-stringified"\n}')
        testBuffer.setText('package util\n\nimport "testing"\nimport "fmt"\n\nfunc TestExample(t *testing.T) {\n\tfmt.Println(Stringify("Testing"))\n}')
        secondBuffer.save()
        thirdBuffer.save()
        testBuffer.save()

      waitsFor ->
        not secondBuffer.isModified() and not thirdBuffer.isModified() and not testBuffer.isModified()

      runs ->
        expect(fs.readFileSync(thirdFilePath, {encoding: 'utf8'})).toBe('package util\n\n// Stringify stringifies text\nfunc Stringify(text string) string {\n\t42\n\treturn text + "-stringified"\n}')
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.once 'dispatch-complete', ->
          expect(fs.readFileSync(secondFilePath, {encoding: 'utf8'})).toBe('package util\n\nimport "fmt"\n\n// ProcessString processes strings\nfunc ProcessString(text string) {\n\tfmt.Println("Processing...")\n\tfmt.Println(Stringify("Testing"))\n}')
          expect(fs.readFileSync(thirdFilePath, {encoding: 'utf8'})).toBe('package util\n\n// Stringify stringifies text\nfunc Stringify(text string) string {\n\t42\n\treturn text + "-stringified"\n}')
          expect(dispatch.messages?).toBe(true)
          expect(_.size(dispatch.messages)).toBe(1)
          expect(dispatch.messages[0].file).toBe(thirdFilePath)
          expect(dispatch.messages[0].line).toBe('5')
          expect(dispatch.messages[0].msg).toBe('42 evaluated but not used')
          expect(dispatch.messages[0].type).toBe('error')
          expect(dispatch.messages[0].column).toBe(false)
          done = true
        testBuffer.save()

      waitsFor ->
        done is true

  describe 'when files are opened outside a gopath', ->
    [otherdirectory] = []

    ready = false
    beforeEach ->
      otherdirectory = temp.mkdirSync()
      process.env['GOPATH'] = otherdirectory
      atom.config.set('go-plus.goPath', otherdirectory)
      atom.config.set('go-plus.syntaxCheckOnSave', true)
      filePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'go-plus.go')
      testFilePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'go-plus_test.go')
      fs.writeFileSync(filePath, '')
      fs.writeFileSync(testFilePath, '')

      waitsForPromise ->
        atom.workspace.open(filePath).then((e) -> editor = e)

      waitsForPromise ->
        atom.workspace.open(testFilePath).then((e) -> testEditor = e)

      waitsForPromise ->
        atom.packages.activatePackage('language-go')

      waitsForPromise -> atom.packages.activatePackage('go-plus').then (g) ->
        mainModule = g.mainModule

      waitsFor ->
        mainModule.dispatch?.ready

      runs ->
        dispatch = mainModule.dispatch

    it 'displays warnings about the gopath, but still displays errors', ->
      done = false
      runs ->
        fs.unlinkSync(testFilePath)
        buffer = editor.getBuffer()
        buffer.setText('package main\n\nimport "fmt"\n\nfunc main()  {\n42\nreturn\nfmt.Println("Unreachable...")}\n')
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch
        dispatch.once 'dispatch-complete', ->
          expect(fs.readFileSync(filePath, {encoding: 'utf8'})).toBe('package main\n\nimport "fmt"\n\nfunc main()  {\n42\nreturn\nfmt.Println("Unreachable...")}\n')
          expect(dispatch.messages?).toBe(true)
          expect(_.size(dispatch.messages)).toBe(2)
          expect(dispatch.messages[0]?.column).toBe(false)
          expect(dispatch.messages[0]?.line).toBe(false)
          expect(dispatch.messages[0]?.msg).toBe('Warning: GOPATH [' + otherdirectory + '] does not contain a "src" directory - please review http://golang.org/doc/code.html#Workspaces')
          expect(dispatch.messages[1]?.column).toBe(false)
          expect(dispatch.messages[1]?.file).toBe(fs.realpathSync(filePath))
          expect(dispatch.messages[1]?.line).toBe('6')
          expect(dispatch.messages[1]?.msg).toBe('42 evaluated but not used')
          done = true
        buffer.save()

      waitsFor ->
        done is true
