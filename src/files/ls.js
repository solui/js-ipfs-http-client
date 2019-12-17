'use strict'

const CID = require('cids')
const ndjson = require('iterable-ndjson')
const toIterable = require('stream-to-it/source')
const configure = require('../lib/configure')
const toCamel = require('../lib/object-to-camel')

module.exports = configure(({ ky }) => {
  return async function * ls (path, options) {
    if (typeof path !== 'string') {
      options = path
      path = '/'
    }

    options = options || {}

    const searchParams = new URLSearchParams(options.searchParams)
    searchParams.set('arg', CID.isCID(path) ? `/ipfs/${path}` : path)
    searchParams.set('stream', true)
    if (options.cidBase) searchParams.set('cid-base', options.cidBase)
    searchParams.set('long', options.long == null ? true : options.long)

    const res = await ky.post('files/ls', {
      timeout: options.timeout,
      signal: options.signal,
      headers: options.headers,
      searchParams
    })

    for await (const result of ndjson(toIterable(res.body))) {
      // go-ipfs does not yet support the "stream" option
      if ('Entries' in result) {
        for (const entry of result.Entries || []) {
          yield toCoreInterface(toCamel(entry))
        }
        return
      }
      yield toCoreInterface(toCamel(result))
    }
  }
})

function toCoreInterface (entry) {
  entry.cid = new CID(entry.hash)
  delete entry.hash
  return entry
}
