'use strict'

const ndjson = require('iterable-ndjson')
const CID = require('cids')
const configure = require('../lib/configure')
const toIterable = require('stream-to-it/source')

module.exports = configure(({ ky }) => {
  return async function * ls (path, options) {
    if (path && path.type) {
      options = path
      path = null
    }

    path = path || []
    path = Array.isArray(path) ? path : [path]
    options = options || {}

    const searchParams = new URLSearchParams(options.searchParams)
    searchParams.set('stream', true)
    path.forEach(p => searchParams.append('arg', `${p}`))
    if (options.type) searchParams.set('type', options.type)

    const res = await ky.post('pin/ls', {
      timeout: options.timeout,
      signal: options.signal,
      headers: options.headers,
      searchParams
    })

    for await (const pin of ndjson(toIterable(res.body))) {
      // For nodes that do not understand the `stream option`
      if (pin.Keys) {
        for (const cid of Object.keys(pin.Keys)) {
          yield { cid: new CID(cid), type: pin.Keys[cid].Type }
        }
        return
      }
      yield { cid: new CID(pin.Cid), type: pin.Type }
    }
  }
})
