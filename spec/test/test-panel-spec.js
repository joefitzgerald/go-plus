/** @babel */
/* eslint-env jasmine */

import TestPanel from './../../lib/test/test-panel'

describe('test panel', () => {
  let testPanel

  beforeEach(() => {
    testPanel = new TestPanel()
  })

  describe('make link', () => {
    it('renders text without links', () => {
      const elements = testPanel.makeLink('test')
      expect(elements.length).toBe(1)
    })

    it('renders a link', () => {
      const elements = testPanel.makeLink('/Users/user/go/src/foo/bar.go:23')
      console.log(elements)
      expect(elements.length).toBe(2)
      expect(elements[0].tagName).toBe('SPAN')
      expect(elements[1].tagName).toBe('A')
      expect(elements[0].children[0].text).toBe('')
      expect(elements[1].children[0].text).toBe('/Users/user/go/src/foo/bar.go:23')
    })

    it('renders a link to a go file (relative path)', () => {
      const elements = testPanel.makeLink('failure at foo/bar.go:23')
      expect(elements.length).toBe(2)
      expect(elements[0].tagName).toBe('SPAN')
      expect(elements[1].tagName).toBe('A')
      expect(elements[1].children[0].text).toBe('foo/bar.go:23')
    })

    it('renders a link to a go file (absolute path)', () => {
      const elements = testPanel.makeLink('failure at /home/user/go/src/foo/bar.go:23')
      expect(elements.length).toBe(2)
      expect(elements[0].tagName).toBe('SPAN')
      expect(elements[1].tagName).toBe('A')
      expect(elements[1].children[0].text).toBe('/home/user/go/src/foo/bar.go:23')
    })

    it('renders a link to a test go file (relative path)', () => {
      const elements = testPanel.makeLink('failure at foo/bar_test.go:23')
      expect(elements.length).toBe(2)
      expect(elements[0].tagName).toBe('SPAN')
      expect(elements[1].tagName).toBe('A')
      expect(elements[1].children[0].text).toBe('foo/bar_test.go:23')
    })

    it('renders a link to a test go file (absolute path)', () => {
      const elements = testPanel.makeLink('failure at /home/user/go/src/foo/bar_test.go:23')
      expect(elements.length).toBe(2)
      expect(elements[0].tagName).toBe('SPAN')
      expect(elements[1].tagName).toBe('A')
      expect(elements[1].children[0].text).toBe('/home/user/go/src/foo/bar_test.go:23')
    })

    it('renders links to Windows paths', () => {
      const elements = testPanel.makeLink('failure at C:\\Users\\Me\\go\\src\\foo\\bar_test.go:23')
      expect(elements.length).toBe(2)
      expect(elements[0].tagName).toBe('SPAN')
      expect(elements[1].tagName).toBe('A')
      expect(elements[1].children[0].text).toBe('C:\\Users\\Me\\go\\src\\foo\\bar_test.go:23')
    })

    it('renders multiple links', () => {
      const elements = testPanel.makeLink('failures at foo/bar.go:12 and baz/quux.go:34')
      expect(elements.length).toBe(4)
      expect(elements[0].tagName).toBe('SPAN')
      expect(elements[1].tagName).toBe('A')
      expect(elements[2].tagName).toBe('SPAN')
      expect(elements[3].tagName).toBe('A')

      expect(elements[1].children[0].text).toBe('foo/bar.go:12')
      expect(elements[3].children[0].text).toBe('baz/quux.go:34')
    })

    it('renders a link with prefix and suffix', () => {
      const elements = testPanel.makeLink('prefix foo/bar.go:23 suffix')
      expect(elements.length).toBe(3)
      expect(elements[0].tagName).toBe('SPAN')
      expect(elements[1].tagName).toBe('A')
      expect(elements[2].tagName).toBe('SPAN')

      expect(elements[0].children[0].text).toBe('prefix ')
      expect(elements[1].children[0].text).toBe('foo/bar.go:23')
      expect(elements[2].children[0].text).toBe(' suffix')
    })

    it('renders links in multi-line text', () => {
      const elements = testPanel.makeLink('--- FAIL: TestFail (0.00s)\n\tbar_test.go:23: Error!\nFAIL')
      expect(elements.length).toBe(3)
      expect(elements[0].children[0].text).toBe('--- FAIL: TestFail (0.00s)\n\t')
      expect(elements[1].children[0].text).toBe('bar_test.go:23')
      expect(elements[2].children[0].text).toBe(': Error!\nFAIL')
    })
  })
})
