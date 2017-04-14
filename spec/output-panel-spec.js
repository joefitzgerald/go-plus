/** @babel */
/* eslint-env jasmine */

import OutputPanel from './../lib/output-panel'

describe('test panel', () => {
  let outputPanel

  beforeEach(() => {
    outputPanel = new OutputPanel()
  })

  describe('make link', () => {
    it('renders text without links', () => {
      const elements = outputPanel.makeLink('test')
      expect(elements.length).toBe(1)
    })

    it('renders a link', () => {
      const elements = outputPanel.makeLink('/Users/user/go/src/foo/bar.go:23')
      expect(elements).toBeTruthy()
      expect(elements.length).toBe(2)
      expect(elements[0].tag).toBe('span')
      expect(elements[1].tag).toBe('a')
      expect(elements[0].children[0].text).toBe('')
      expect(elements[1].children[0].text).toBe('/Users/user/go/src/foo/bar.go:23')
    })

    it('renders a link to a go file (relative path)', () => {
      const elements = outputPanel.makeLink('failure at foo/bar.go:23')
      expect(elements.length).toBe(2)
      expect(elements[0].tag).toBe('span')
      expect(elements[1].tag).toBe('a')
      expect(elements[1].children[0].text).toBe('foo/bar.go:23')
    })

    it('renders a link to a go file (absolute path)', () => {
      const elements = outputPanel.makeLink('failure at /home/user/go/src/foo/bar.go:23')
      expect(elements.length).toBe(2)
      expect(elements[0].tag).toBe('span')
      expect(elements[1].tag).toBe('a')
      expect(elements[1].children[0].text).toBe('/home/user/go/src/foo/bar.go:23')
    })

    it('renders a link to a test go file (relative path)', () => {
      const elements = outputPanel.makeLink('failure at foo/bar_test.go:23')
      expect(elements.length).toBe(2)
      expect(elements[0].tag).toBe('span')
      expect(elements[1].tag).toBe('a')
      expect(elements[1].children[0].text).toBe('foo/bar_test.go:23')
    })

    it('renders a link to a test go file (absolute path)', () => {
      const elements = outputPanel.makeLink('failure at /home/user/go/src/foo/bar_test.go:23')
      expect(elements.length).toBe(2)
      expect(elements[0].tag).toBe('span')
      expect(elements[1].tag).toBe('a')
      expect(elements[1].children[0].text).toBe('/home/user/go/src/foo/bar_test.go:23')
    })

    it('renders links to Windows paths', () => {
      const elements = outputPanel.makeLink('failure at C:\\Users\\Me\\go\\src\\foo\\bar_test.go:23')
      expect(elements.length).toBe(2)
      expect(elements[0].tag).toBe('span')
      expect(elements[1].tag).toBe('a')
      expect(elements[1].children[0].text).toBe('C:\\Users\\Me\\go\\src\\foo\\bar_test.go:23')
    })

    it('renders multiple links', () => {
      const elements = outputPanel.makeLink('failures at foo/bar.go:12 and baz/quux.go:34')
      expect(elements.length).toBe(4)
      expect(elements[0].tag).toBe('span')
      expect(elements[1].tag).toBe('a')
      expect(elements[2].tag).toBe('span')
      expect(elements[3].tag).toBe('a')

      expect(elements[1].children[0].text).toBe('foo/bar.go:12')
      expect(elements[3].children[0].text).toBe('baz/quux.go:34')
    })

    it('renders a link with prefix and suffix', () => {
      const elements = outputPanel.makeLink('prefix foo/bar.go:23 suffix')
      expect(elements.length).toBe(3)
      expect(elements[0].tag).toBe('span')
      expect(elements[1].tag).toBe('a')
      expect(elements[2].tag).toBe('span')

      expect(elements[0].children[0].text).toBe('prefix ')
      expect(elements[1].children[0].text).toBe('foo/bar.go:23')
      expect(elements[2].children[0].text).toBe(' suffix')
    })

    it('renders links in multi-line text', () => {
      const elements = outputPanel.makeLink('--- FAIL: TestFail (0.00s)\n\tbar_test.go:23: Error!\nFAIL')
      expect(elements.length).toBe(3)
      expect(elements[0].children[0].text).toBe('--- FAIL: TestFail (0.00s)\n\t')
      expect(elements[1].children[0].text).toBe('bar_test.go:23')
      expect(elements[2].children[0].text).toBe(': Error!\nFAIL')
    })
  })
})
