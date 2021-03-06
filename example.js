const util = require('util')
const FlumeLog = require('flumelog-aligned-offset')
const Obv = require('obv')

const bAuthorValue = Buffer.from('@6CAxOI3f+LUOVrbAl0IemqiS7ATpQvr9Mdw9LC4+Uv0=.ed25519')
const bPostValue = Buffer.from('post')
const bContactValue = Buffer.from('contact')

var raf = FlumeLog(process.argv[2], {block: 64*1024})
raf.since = Obv()
raf.onWrite = raf.since.set

var db = require('./index')(raf, "./indexes")
db.onReady(() => {
  // seems the cache needs to be warmed up to get fast results

  console.time("get all posts from user")

  db.query({
    type: 'AND',
    data: [
      { type: 'EQUAL', data: { seek: db.seekType, value: bPostValue, indexType: "type" } },
      { type: 'EQUAL', data: { seek: db.seekAuthor, value: bAuthorValue, indexType: "author" } }
    ]
  }, 0, (err, results) => {
    console.timeEnd("get all posts from user")

    console.time("get last 10 posts from user")

    db.query({
      type: 'AND',
      data: [
        { type: 'EQUAL', data: { seek: db.seekType, value: bPostValue, indexType: "type" } },
        { type: 'EQUAL', data: { seek: db.seekAuthor, value: bAuthorValue, indexType: "author" } }
      ]
    }, 10, (err, results) => {
      console.timeEnd("get last 10 posts from user")

      console.time("get top 50 posts")

      db.query({
        type: 'EQUAL',
        data: {
          seek: db.seekType,
          value: bPostValue,
          indexType: "type"
        }
      }, 50, (err, results) => {
        console.timeEnd("get top 50 posts")

        var hops = {}
        const query = { type: 'EQUAL', data: { seek: db.seekType, value: bContactValue, indexType: "type" } }
        const isFeed = require('ssb-ref').isFeed

        console.time("contacts")

        db.query(query, 0, (err, results) => {
          results.forEach(data => {
            var from = data.value.author
            var to = data.value.content.contact
            var value =
                data.value.content.blocking || data.value.content.flagged ? -1 :
                data.value.content.following === true ? 1
                : -2

            if(isFeed(from) && isFeed(to)) {
              hops[from] = hops[from] || {}
              hops[from][to] = value
            }
          })

          console.timeEnd("contacts")
          //console.log(hops)
        })
      })
    })
  })

  return

  console.time("get all")
  db.query({
    type: 'EQUAL',
    data: { seek: db.seekAuthor, value: bAuthorValue, indexType: "author" }
  }, 0, (err, results) => {
    console.timeEnd("get all")
  })

  /*
    db.query({
    type: 'AND',
    data: [
    { type: 'EQUAL', data: { seek: seekType, value: bPostValue, indexName: "type_post" } },
    { type: 'EQUAL', data: { seek: seekAuthor, value: bAuthorValue, indexName: "author_arj" } }
    ]
    }, true, (err, results) => {
    results.forEach(x => {
    console.log(util.inspect(x, false, null, true))
    })
    })
  */

  /*
    db.query({
    type: 'AND',
    data: [
    { type: 'EQUAL', data: { seek: seekAuthor, value: bAuthorValue, indexName: "author_arj" } },
    {
    type: 'OR',
    data: [
    { type: 'EQUAL', data: { seek: seekType, value: bPostValue, indexName: "type_post" } },
    { type: 'EQUAL', data: { seek: seekType, value: bContactValue, indexName: "type_contact" } },
    ]
    }
    ]
    }, true, (err, results) => {
    results.forEach(x => {
    console.log(util.inspect(x, false, null, true))
    })
    })
  */
})
