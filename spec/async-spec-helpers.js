/* eslint-env jasmine */

/* eslint-disable promise/no-callback-in-promise */
/* eslint-disable promise/catch-or-return */

exports.beforeEach = function beforeEach(fn) {
  global.beforeEach(function() {
    const result = fn()
    if (result instanceof Promise) {
      waitsForPromise(() => result)
    }
  })
}

exports.runs = function runs(fn) {
  global.runs(function() {
    const result = fn()
    if (result instanceof Promise) {
      waitsForPromise(() => result)
    }
  })
}

exports.afterEach = function afterEach(fn) {
  global.afterEach(function() {
    const result = fn()
    if (result instanceof Promise) {
      waitsForPromise(() => result)
    }
  })
}

const funcs = ['it', 'fit', 'ffit', 'fffit']

funcs.forEach(function(name) {
  exports[name] = function(description, fn) {
    if (fn === undefined) {
      global[name](description)
      return
    }

    global[name](description, function() {
      const result = fn()
      if (result instanceof Promise) {
        waitsForPromise(() => result)
      }
    })
  }
})

function waitsForPromise(fn) {
  const promise = fn()
  global.waitsFor('spec promise to resolve', function(done) {
    promise.then(done, function(error) {
      jasmine.getEnv().currentSpec.fail(error)
      done()
    })
  })
}
