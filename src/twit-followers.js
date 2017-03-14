const fetch = require('node-fetch')

fetch('https://jsonplaceholder.typicode.com/posts/1')
  .then(response => {
    response.json()
      .then(data => console.log({json: data}))
      .catch(err => console.error(`error deserializing json: ${err}`))
  })
  .catch(err => console.error(`fetch failed: ${err}`))
