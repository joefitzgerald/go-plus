'use babel'
/* eslint-env jasmine */

import * as Suggestions from '../../lib/autocomplete/suggestions'

describe('gocodeprovider-suggestions', () => {
  describe('matchFunc', () => {
    let t = (context) => {
      let match = Suggestions.matchFunc(context.input)
      expect(match).toBeTruthy()
      expect(match.length).toBe(3)
      expect(match[0]).toBe(context.input)
      expect(match[1]).toBe(context.args)
      expect(match[2]).toBe(context.returns)
    }

    it('identifies function arguments', () => {
      t({
        input: 'func(name string, flag bool) bool',
        args: 'name string, flag bool',
        returns: 'bool'
      })
      t({
        input: 'func(name string, flag bool) (bool)',
        args: 'name string, flag bool',
        returns: 'bool'
      })
      t({
        input: 'func(name string, f func(t *testing.T)) bool',
        args: 'name string, f func(t *testing.T)',
        returns: 'bool'
      })
      t({
        input: 'func(name string, f func(t *testing.T)) (bool)',
        args: 'name string, f func(t *testing.T)',
        returns: 'bool'
      })
      t({
        input: 'func(name string, f func(t *testing.T) int) (bool)',
        args: 'name string, f func(t *testing.T) int',
        returns: 'bool'
      })
      t({
        input: 'func(pattern string, handler func(http.ResponseWriter, *http.Request))',
        args: 'pattern string, handler func(http.ResponseWriter, *http.Request)',
        returns: undefined
      })
      t({
        input: 'func(n int) func(p *T)',
        args: 'n int',
        returns: 'func(p *T)'
      })
    })
  })

  describe('parseType', () => {
    let t = (context) => {
      let result = Suggestions.parseType(context.input)
      expect(result).toBeTruthy()
      expect(result.isFunc).toBeTruthy()
      expect(result.args).toEqual(context.args)
      expect(result.returns).toEqual(context.returns)
    }

    it('parses the function into args and returns arrays', () => {
      t({
        input: 'func(name string, flag bool) bool',
        args: [{
          name: 'name string',
          identifier: 'name',
          type: {name: 'string', isFunc: false}
        }, {
          name: 'flag bool',
          identifier: 'flag',
          type: {name: 'bool', isFunc: false}
        }],
        returns: [{
          name: 'bool',
          identifier: '',
          type: {name: 'bool', isFunc: false}
        }]
      })

      t({
        input: 'func(name string, flag bool) (bool)',
        args: [{
          name: 'name string',
          identifier: 'name',
          type: {name: 'string', isFunc: false}
        }, {
          name: 'flag bool',
          identifier: 'flag',
          type: {name: 'bool', isFunc: false}
        }],
        returns: [{
          name: 'bool',
          identifier: '',
          type: {name: 'bool', isFunc: false}
        }]
      })

      t({
        input: 'func(name string, f func(t *testing.T)) bool',
        args: [{
          name: 'name string',
          identifier: 'name',
          type: {name: 'string', isFunc: false}
        }, {
          name: 'f func(t *testing.T)',
          identifier: 'f',
          type: {
            isFunc: true,
            name: 'func(t *testing.T)',
            args: [{
              name: 't *testing.T',
              identifier: 't',
              type: {name: '*testing.T', isFunc: false}
            }],
            returns: []
          }
        }],
        returns: [{
          name: 'bool',
          identifier: '',
          type: {name: 'bool', isFunc: false}
        }]
      })

      t({
        input: 'func(name string, f func(t *testing.T)) (bool)',
        args: [{
          name: 'name string',
          identifier: 'name',
          type: {name: 'string', isFunc: false}
        }, {
          name: 'f func(t *testing.T)',
          identifier: 'f',
          type: {
            isFunc: true,
            name: 'func(t *testing.T)',
            args: [{
              name: 't *testing.T',
              identifier: 't',
              type: {name: '*testing.T', isFunc: false}
            }],
            returns: []
          }
        }],
        returns: [{
          name: 'bool',
          identifier: '',
          type: {name: 'bool', isFunc: false}
        }]
      })

      t({
        input: 'func(pattern string, handler func(http.ResponseWriter, *http.Request))',
        args: [{
          name: 'pattern string',
          identifier: 'pattern',
          type: {name: 'string', isFunc: false}
        }, {
          name: 'handler func(http.ResponseWriter, *http.Request)',
          identifier: 'handler',
          type: {
            isFunc: true,
            name: 'func(http.ResponseWriter, *http.Request)',
            args: [{
              name: 'http.ResponseWriter',
              identifier: '',
              type: {name: 'http.ResponseWriter', isFunc: false}
            }, {
              name: '*http.Request',
              identifier: '',
              type: {name: '*http.Request', isFunc: false}
            }],
            returns: []
          }
        }],
        returns: []
      })

      t({
        input: 'func(pattern string, handler func(http.ResponseWriter, *http.Request), otherhandler func(http.ResponseWriter, *http.Request))',
        args: [{
          name: 'pattern string',
          identifier: 'pattern',
          type: {name: 'string', isFunc: false}
        }, {
          name: 'handler func(http.ResponseWriter, *http.Request)',
          identifier: 'handler',
          type: {
            isFunc: true,
            name: 'func(http.ResponseWriter, *http.Request)',
            args: [{
              name: 'http.ResponseWriter',
              identifier: '',
              type: {name: 'http.ResponseWriter', isFunc: false}
            }, {
              name: '*http.Request',
              identifier: '',
              type: {name: '*http.Request', isFunc: false}
            }],
            returns: []
          }
        }, {
          name: 'otherhandler func(http.ResponseWriter, *http.Request)',
          identifier: 'otherhandler',
          type: {
            isFunc: true,
            name: 'func(http.ResponseWriter, *http.Request)',
            args: [{
              name: 'http.ResponseWriter',
              identifier: '',
              type: {name: 'http.ResponseWriter', isFunc: false}
            }, {
              name: '*http.Request',
              identifier: '',
              type: {name: '*http.Request', isFunc: false}
            }],
            returns: []
          }
        }],
        returns: []
      })

      t({
        input: 'func(pattern string, handler func(w http.ResponseWriter, r *http.Request), otherhandler func(w http.ResponseWriter, r *http.Request))',
        args: [{
          name: 'pattern string',
          identifier: 'pattern',
          type: {name: 'string', isFunc: false}
        }, {
          name: 'handler func(w http.ResponseWriter, r *http.Request)',
          identifier: 'handler',
          type: {
            isFunc: true,
            name: 'func(w http.ResponseWriter, r *http.Request)',
            args: [{
              name: 'w http.ResponseWriter',
              identifier: 'w',
              type: {name: 'http.ResponseWriter', isFunc: false}
            }, {
              name: 'r *http.Request',
              identifier: 'r',
              type: {name: '*http.Request', isFunc: false}
            }],
            returns: []
          }
        }, {
          name: 'otherhandler func(w http.ResponseWriter, r *http.Request)',
          identifier: 'otherhandler',
          type: {
            isFunc: true,
            name: 'func(w http.ResponseWriter, r *http.Request)',
            args: [{
              name: 'w http.ResponseWriter',
              identifier: 'w',
              type: {name: 'http.ResponseWriter', isFunc: false}
            }, {
              name: 'r *http.Request',
              identifier: 'r',
              type: {name: '*http.Request', isFunc: false}
            }],
            returns: []
          }
        }],
        returns: []
      })

      t({
        input: 'func()',
        args: [],
        returns: []
      })

      t({
        input: 'func(x int) int',
        args: [{
          name: 'x int',
          identifier: 'x',
          type: {name: 'int', isFunc: false}
        }],
        returns: [{
          name: 'int',
          identifier: '',
          type: {name: 'int', isFunc: false}
        }]
      })

      t({
        input: 'func(a, _ int, z float32) bool',
        args: [{
          name: 'a',
          identifier: '',
          type: {name: 'a', isFunc: false}
        }, {
          name: '_ int',
          identifier: '_',
          type: {name: 'int', isFunc: false}
        }, {
          name: 'z float32',
          identifier: 'z',
          type: {name: 'float32', isFunc: false}
        }],
        returns: [{
          name: 'bool',
          identifier: '',
          type: {name: 'bool', isFunc: false}
        }]
      })

      t({
        input: 'func(a, b int, z float32) (bool)',
        args: [{
          name: 'a',
          identifier: '',
          type: {name: 'a', isFunc: false}
        }, {
          name: 'b int',
          identifier: 'b',
          type: {name: 'int', isFunc: false}
        }, {
          name: 'z float32',
          identifier: 'z',
          type: {name: 'float32', isFunc: false}
        }],
        returns: [{
          name: 'bool',
          identifier: '',
          type: {name: 'bool', isFunc: false}
        }]
      })

      t({
        input: 'func(a, b int, z float64, opt ...interface{}) (success bool)',
        args: [{
          name: 'a',
          identifier: '',
          type: {name: 'a', isFunc: false}
        }, {
          name: 'b int',
          identifier: 'b',
          type: {name: 'int', isFunc: false}
        }, {
          name: 'z float64',
          identifier: 'z',
          type: {name: 'float64', isFunc: false}
        }, {
          name: 'opt ...interface{}',
          identifier: 'opt',
          type: {name: '...interface{}', isFunc: false}
        }],
        returns: [{
          name: 'success bool',
          identifier: 'success',
          type: {name: 'bool', isFunc: false}
        }]
      })

      t({
        input: 'func(prefix string, values ...int)',
        args: [{
          name: 'prefix string',
          identifier: 'prefix',
          type: {name: 'string', isFunc: false}
        }, {
          name: 'values ...int',
          identifier: 'values',
          type: {name: '...int', isFunc: false}
        }],
        returns: []
      })

      t({
        input: 'func(int, int, float64) (float64, *[]int)',
        args: [{
          name: 'int',
          identifier: '',
          type: {name: 'int', isFunc: false}
        }, {
          name: 'int',
          identifier: '',
          type: {name: 'int', isFunc: false}
        }, {
          name: 'float64',
          identifier: '',
          type: {name: 'float64', isFunc: false}
        }],
        returns: [{
          name: 'float64',
          identifier: '',
          type: {name: 'float64', isFunc: false}
        }, {
          name: '*[]int',
          identifier: '',
          type: {name: '*[]int', isFunc: false}
        }]
      })

      t({
        input: 'func(n int) func(p *T)',
        args: [{
          name: 'n int',
          identifier: 'n',
          type: {name: 'int', isFunc: false}
        }],
        returns: [{
          name: 'func(p *T)',
          identifier: '',
          type: {
            isFunc: true,
            name: 'func(p *T)',
            args: [{
              name: 'p *T',
              identifier: 'p',
              type: {name: '*T', isFunc: false}
            }],
            returns: []
          }
        }]
      })
    })
  })

  describe('generateSnippet', () => {
    const t = (context) => {
      const result = Suggestions.generateSnippet({ snipCount: 0, argCount: 0, snippetMode: 'nameAndType' }, context.input.name, context.input.type)
      expect(result).toBeTruthy()
      expect(result.displayText).toEqual(context.result.displayText)
      expect(result.snippet).toEqual(context.result.snippet)
    }

    it('parses the function into args and returns arrays', () => {
      t({
        input: {
          name: 'Print',
          type: {
            isFunc: true,
            name: 'func()',
            args: [],
            returns: []
          }
        },
        result: {
          snippet: 'Print()',
          displayText: 'Print()'
        }
      })

      t({
        input: {
          name: 'Print',
          type: {
            isFunc: true,
            name: 'func(x int) int',
            args: [{
              name: 'x int',
              identifier: 'x',
              type: {name: 'int', isFunc: false}
            }],
            returns: [{
              name: 'int',
              identifier: '',
              type: {name: 'int', isFunc: false}
            }]
          }
        },
        result: {
          snippet: 'Print(${1:x int})', // eslint-disable-line no-template-curly-in-string
          displayText: 'Print(x int)'
        }
      })

      t({
        input: {
          name: 'ServeFunc',
          type: {
            isFunc: true,
            name: 'func(pattern string, func(w http.ResponseWriter, r *http.Request))',
            args: [{
              name: 'pattern string',
              identifier: 'pattern',
              type: {name: 'string', isFunc: false}
            }, {
              name: 'func(w http.ResponseWriter, r *http.Request)',
              identifier: '',
              type: {
                isFunc: true,
                name: 'func(w http.ResponseWriter, r *http.Request)',
                args: [{
                  name: 'w http.ResponseWriter',
                  identifier: 'w',
                  type: {name: 'http.ResponseWriter', isFunc: false}
                }, {
                  name: 'r *http.Request',
                  identifier: 'r',
                  type: {name: '*http.Request', isFunc: false}
                }],
                returns: []
              }
            }],
            returns: []
          }
        },
        result: {
          snippet: 'ServeFunc(${1:pattern string}, ${2:func(${3:w} http.ResponseWriter, ${4:r} *http.Request) {\n\t$5\n\\}})', // eslint-disable-line no-template-curly-in-string
          displayText: 'ServeFunc(pattern string, func(w http.ResponseWriter, r *http.Request))'
        }
      })

      t({
        input: {
          name: 'It',
          type: {
            isFunc: true,
            name: 'func(text string, body interface{}, timeout ...float64) bool',
            args: [
              {
                name: 'text string',
                identifier: 'text',
                type: {name: 'string', isFunc: false}
              },
              {
                name: 'body interface{}',
                identifier: 'body',
                type: {name: 'interface{}', isFunc: false}
              },
              {
                name: 'timeout ...float64',
                identifier: 'timeout',
                type: {name: '...float64', isFunc: false}
              }
            ],
            returns: [
              {
                name: 'bool',
                identifier: '',
                type: {name: 'bool', isFunc: false}
              }
            ]
          }
        },
        result: {
          // snippet: 'It(${1:text string}, ${2:body interface{\\}}, ${3:timeout ...float64})',
          snippet: 'It(${1:text string}, ${2:body interface{\\}})', // eslint-disable-line no-template-curly-in-string
          displayText: 'It(text string, body interface{}, timeout ...float64)'
        }
      })

      t({
        input: {
          name: 'Bleh',
          type: {
            isFunc: true,
            name: 'func(f func() interface{})',
            args: [{
              name: 'f func() interface{}',
              identifier: 'f',
              type: {
                isFunc: true,
                name: 'func() interface{}',
                args: [],
                returns: [{
                  name: 'interface{}',
                  identifier: '',
                  type: {name: 'interface{}', isFunc: false}
                }]
              }
            }],
            returns: []
          }
        },
        result: {
          snippet: 'Bleh(${1:func() interface{\\} {\n\t$2\n\\}})', // eslint-disable-line no-template-curly-in-string
          displayText: 'Bleh(func() interface{})'
        }
      })

      // this is just a ridiculous func to test the limits of the function...
      t({
        input: {
          name: 'Bleh',
          type: {
            isFunc: true,
            name: 'func(f func(i interface{}) func(interface{}) interface{})',
            args: [{
              name: 'f func(i interface{}) func(interface{}) interface{}',
              identifier: 'f',
              type: {
                isFunc: true,
                name: 'func(i interface{}) func(interface{}) interface{}',
                args: [{
                  name: 'i interface{}',
                  identifier: 'i',
                  type: {name: 'interface{}', isFunc: false}
                }],
                returns: [{
                  name: 'func(interface{}) interface{}',
                  identifier: '',
                  type: {
                    isFunc: true,
                    name: 'func(interface{}) interface{}',
                    args: [{
                      name: 'interface{}',
                      identifier: 'i',
                      type: {name: 'interface{}', isFunc: false}
                    }],
                    returns: [{
                      name: 'interface{}',
                      identifier: '',
                      type: {name: 'interface{}', isFunc: false}
                    }]
                  }
                }]
              }
            }],
            returns: []
          }
        },
        result: {
          snippet: 'Bleh(${1:func(${2:i} interface{\\}) func(interface{\\}) interface{\\} {\n\t$3\n\\}})', // eslint-disable-line no-template-curly-in-string
          displayText: 'Bleh(func(i interface{}) func(interface{}) interface{})'
        }
      })
      /*
      func(x int) int
      func(a, _ int, z float32) bool
      func(a, b int, z float32) (bool)
      func(prefix string, values ...int)
      func(a, b int, z float64, opt ...interface{}) (success bool)
      func(int, int, float64) (float64, *[]int)
      func(n int) func(p *T)
      */
    })
  })

  describe('ensureNextArg', () => {
    it('parses params', () => {
      let result = Suggestions.ensureNextArg(['f func() int'])
      expect(result).toEqual(['f func() int'])
      result = Suggestions.ensureNextArg(['f func() int, s string'])
      expect(result).toEqual(['f func() int', 's string'])
      result = Suggestions.ensureNextArg(['f func(s1 string, i1 int) int, s string'])
      expect(result).toEqual(['f func(s1 string, i1 int) int', 's string'])
    })
  })

  describe('toSuggestion', () => {
    const toSuggestion = (candidate, o = {}) => {
      return Suggestions.toSuggestion(
        candidate,
        { prefix: '', suffix: '', snippetMode: 'nameAndType', ...o }
      )
    }

    it('generates snippets', () => {
      let result = toSuggestion({
        class: 'func',
        name: 'Abc',
        type: 'func(f func() int)'
      })
      expect(result.displayText).toBe('Abc(func() int)')
      expect(result.snippet).toBe('Abc(${1:func() int {\n\t$2\n\\}})$0') // eslint-disable-line no-template-curly-in-string

      result = toSuggestion({
        class: 'func',
        name: 'Abc',
        type: 'func(f func() interface{})'
      })
      expect(result.displayText).toBe('Abc(func() interface{})')
      expect(result.snippet).toBe('Abc(${1:func() interface{\\} {\n\t$2\n\\}})$0') // eslint-disable-line no-template-curly-in-string

      result = toSuggestion({
        class: 'func',
        name: 'Abc',
        type: 'func(f func(int, string, bool) interface{})'
      })
      expect(result.displayText).toBe('Abc(func(arg1 int, arg2 string, arg3 bool) interface{})')
      expect(result.snippet).toBe(
        'Abc(${1:func(${2:arg1} int, ${3:arg2} string, ${4:arg3} bool) interface{\\} {\n\t$5\n\\}})$0' // eslint-disable-line no-template-curly-in-string
      )

      result = toSuggestion({
        class: 'func',
        name: 'Abc',
        type: 'func(f func() (interface{}, interface{}))'
      })
      expect(result.displayText).toBe('Abc(func() (interface{}, interface{}))')
      expect(result.snippet).toBe('Abc(${1:func() (interface{\\}, interface{\\}) {\n\t$2\n\\}})$0') // eslint-disable-line no-template-curly-in-string

      result = toSuggestion({
        class: 'func',
        name: 'Abc',
        type: 'func(f interface{})'
      })
      expect(result.displayText).toBe('Abc(f interface{})')
      expect(result.snippet).toBe('Abc(${1:f interface{\\}})$0') // eslint-disable-line no-template-curly-in-string

      // type HandlerFunc func(http.ResponseWriter, *http.Request)
      result = toSuggestion({
        class: 'type',
        name: 'HandlerFunc',
        type: 'func(http.ResponseWriter, *http.Request)'
      })
      expect(result.snippet).toBe('HandlerFunc(func(${1:arg1} http.ResponseWriter, ${2:arg2} *http.Request) {\n\t$3\n\\})$0') // eslint-disable-line no-template-curly-in-string
      expect(result.displayText).toBe('HandlerFunc')

      // type FooBar func(int, string) string
      result = toSuggestion({
        class: 'type',
        name: 'FooBar',
        type: 'func(int, string) string'
      })
      expect(result.snippet).toBe('FooBar(func(${1:arg1} int, ${2:arg2} string) string {\n\t$3\n\\})$0') // eslint-disable-line no-template-curly-in-string
      expect(result.displayText).toBe('FooBar')

      // type FooBar func(int, ...string) string
      result = toSuggestion({
        class: 'type',
        name: 'FooBar',
        type: 'func(int, ...string) string'
      })
      expect(result.snippet).toBe('FooBar(func(${1:arg1} int, ${2:arg2} ...string) string {\n\t$3\n\\})$0') // eslint-disable-line no-template-curly-in-string
      expect(result.displayText).toBe('FooBar')
    })

    it('does not add function arguments for ( suffix', () => {
      let result = toSuggestion({
        class: 'func',
        name: 'Abc',
        type: 'func(f func() int)'
      }, { suffix: '(' })
      expect(result.text).toBe('Abc')
      expect(result.snippet).toBeFalsy()
      expect(result.displayText).toBeFalsy()

      // type FooBar func(int, string) string
      result = toSuggestion({
        class: 'type',
        name: 'FooBar',
        type: 'func(int, string) string'
      }, { suffix: '(' })
      expect(result.text).toBe('FooBar')
      expect(result.snippet).toBeFalsy()
      expect(result.displayText).toBeFalsy()
    })
  })
})
