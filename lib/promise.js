// @flow
'use babel'

const promiseWaterfall = (tasks: Array<() => Promise<any>>): Promise<any> => {
  const p = Promise.resolve()
  const results = []
  const finalTaskPromise = tasks.reduce((prevTaskPromise, task) => {
    return prevTaskPromise.then((r) => {
      if (r) {
        results.push(r)
      }

      return task()
    })
  }, p)

  return finalTaskPromise.then((r) => {
    if (r) {
      results.push(r)
    }

    return results
  })
}

export {promiseWaterfall}
