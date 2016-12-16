'use babel'

const promiseWaterfall = (tasks) => {
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
