'use babel'

let promiseWaterfall = (tasks) => {
  let p = Promise.resolve()
  let results = []
  let finalTaskPromise = tasks.reduce((prevTaskPromise, task) => {
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
