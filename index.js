'use strict'

/**
 * static files (404.html, sw.js, conf.js)
 */
const ASSET_URL = 'https://hunshcn.github.io/gh-proxy/'
const PREFIX = '/'
const Config = {
    jsdelivr: 0,
    cache: {
        release: 86400,
        raw: 3600,
        static: 604800,
    },
    kv: {
        enabled: true,
        releaseTTL: 604800,
        rawTTL: 86400,
    }
}

const whiteList = []

/** @type {ResponseInit} */
const PREFLIGHT_INIT = {
    status: 204,
    headers: new Headers({
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,TRACE,DELETE,HEAD,OPTIONS',
        'access-control-max-age': '1728000',
    }),
}


const exp1 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:releases|archive)\/.*$/i
const exp2 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:blob|raw)\/.*$/i
const exp3 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:info|git-).*$/i
const exp4 = /^(?:https?:\/\/)?raw\.(?:githubusercontent|github)\.com\/.+?\/.+?\/.+?\/.+$/i
const exp5 = /^(?:https?:\/\/)?gist\.(?:githubusercontent|github)\.com\/.+?\/.+?\/.+$/i
const exp6 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/tags.*$/i

/**
 * @param {any} body
 * @param {number} status
 * @param {Object<string, string>} headers
 */
function makeRes(body, status = 200, headers = {}) {
    headers['access-control-allow-origin'] = '*'
    return new Response(body, { status, headers })
}

/**
 * @param {string} urlStr
 */
function newUrl(urlStr) {
    try {
        return new URL(urlStr)
    } catch (err) {
        return null
    }
}

addEventListener('fetch', e => {
    const ret = fetchHandler(e)
        .catch(err => makeRes('cfworker error:\n' + err.stack, 502))
    e.respondWith(ret)
})


function checkUrl(u) {
    for (let i of [exp1, exp2, exp3, exp4, exp5, exp6]) {
        if (u.search(i) === 0) {
            return true
        }
    }
    return false
}

function getCacheTTL(url) {
    if (/releases|archive/.test(url)) return Config.cache.release
    if (/raw/.test(url)) return Config.cache.raw
    return Config.cache.static
}

function getKVTTL(url) {
    if (/releases|archive/.test(url)) return Config.kv.releaseTTL
    if (/raw/.test(url)) return Config.kv.rawTTL
    return Config.kv.releaseTTL
}

/**
 * @param {Request} request
 * @returns {Promise<Response|undefined>}
 */
async function checkCache(request) {
    try {
        return await caches.default.match(request)
    } catch (err) {
        return undefined
    }
}

/**
 * @param {FetchEvent} event
 * @param {Request} request
 * @param {Response} response
 * @param {number} ttl
 */
function putCache(event, request, response, ttl) {
    const cache = caches.default
    const cacheKey = new Request(request.url, request)
    const headers = new Headers(response.headers)
    headers.set('cache-control', `public, max-age=${ttl}`)
    headers.set('x-cache-status', 'CF-HIT')
    const responseToCache = new Response(response.clone().body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers,
    })
    event.waitUntil(cache.put(cacheKey, responseToCache))
}

/**
 * @param {string} url
 * @returns {Promise<Response|undefined>}
 */
async function checkKV(url) {
    if (!Config.kv.enabled || typeof KV === 'undefined') return undefined
    try {
        const cached = await KV.get(url)
        if (cached) {
            return new Response(cached, {
                headers: {
                    'content-type': 'application/octet-stream',
                    'x-cache-status': 'KV-HIT',
                    'cache-control': `public, max-age=${getKVTTL(url)}`,
                }
            })
        }
    } catch (err) {
    }
    return undefined
}

/**
 * @param {FetchEvent} event
 * @param {string} url
 * @param {Response} response
 * @param {number} ttl
 */
function putKV(event, url, response, ttl) {
    if (!Config.kv.enabled || typeof KV === 'undefined') return
    event.waitUntil(
        response.clone().text().then(body => KV.put(url, body, { expirationTtl: ttl }))
    )
}

/**
 * @param {Headers} headers
 * @returns {Headers}
 */
function optimizeRequestHeaders(headers) {
    const newHeaders = new Headers(headers)
    newHeaders.delete('connection')
    newHeaders.delete('keep-alive')
    newHeaders.delete('proxy-authorization')
    newHeaders.delete('proxy-authenticate')
    return newHeaders
}

/**
 * @param {FetchEvent} event
 * @param {Request} req
 * @param {string} pathname
 */
function httpHandler(event, req, pathname) {
    const reqHdrRaw = req.headers

    if (req.method === 'OPTIONS' &&
        reqHdrRaw.has('access-control-request-headers')
    ) {
        return new Response(null, PREFLIGHT_INIT)
    }

    const reqHdrNew = new Headers(reqHdrRaw)

    let urlStr = pathname
    let flag = !Boolean(whiteList.length)
    for (let i of whiteList) {
        if (urlStr.includes(i)) {
            flag = true
            break
        }
    }
    if (!flag) {
        return new Response("blocked", { status: 403 })
    }
    if (urlStr.search(/^https?:\/\//) !== 0) {
        urlStr = 'https://' + urlStr
    }
    const urlObj = newUrl(urlStr)

    /** @type {RequestInit} */
    const reqInit = {
        method: req.method,
        headers: reqHdrNew,
        redirect: 'manual',
        body: req.body
    }
    return proxy(event, urlObj, reqInit)
}

/**
 * @param {FetchEvent} event
 */
async function fetchHandler(event) {
    const req = event.request
    const urlStr = req.url
    const urlObj = new URL(urlStr)
    let path = urlObj.searchParams.get('q')
    if (path) {
        return Response.redirect('https://' + urlObj.host + PREFIX + path, 301)
    }
    path = urlObj.href.slice(urlObj.origin.length + PREFIX.length).replace(/^https?:\/+/, 'https://')
    if (path.search(exp1) === 0 || path.search(exp5) === 0 || path.search(exp6) === 0 || path.search(exp3) === 0) {
        return httpHandler(event, req, path)
    } else if (path.search(exp2) === 0) {
        if (Config.jsdelivr) {
            const newUrl = path.replace('/blob/', '@').replace(/^(?:https?:\/\/)?github\.com/, 'https://cdn.jsdelivr.net/gh')
            return Response.redirect(newUrl, 302)
        } else {
            path = path.replace('/blob/', '/raw/')
            return httpHandler(event, req, path)
        }
    } else if (path.search(exp4) === 0) {
        if (Config.jsdelivr) {
            const newUrl = path.replace(/(?<=com\/.+?\/.+?)\/(.+?\/)/, '@$1').replace(/^(?:https?:\/\/)?raw\.(?:githubusercontent|github)\.com/, 'https://cdn.jsdelivr.net/gh')
            return Response.redirect(newUrl, 302)
        }
        else {
            return httpHandler(event, req, path)
        }
    } else {
        return fetch(ASSET_URL + path)
    }
}

/**
 * @param {FetchEvent} event
 * @param {URL} urlObj
 * @param {RequestInit} reqInit
 */
async function proxy(event, urlObj, reqInit) {
    // 1. KV cache
    const kvCached = await checkKV(urlObj.href)
    if (kvCached) return kvCached

    // 2. Cache API
    const req = new Request(urlObj.href, reqInit)
    const apiCached = await checkCache(req)
    if (apiCached) return apiCached

    // 3. optimize request headers
    reqInit.headers = optimizeRequestHeaders(reqInit.headers)

    // 4. fetch from origin
    const res = await fetch(urlObj.href, reqInit)
    const resHdrOld = res.headers
    const resHdrNew = new Headers(resHdrOld)

    const status = res.status

    if (resHdrNew.has('location')) {
        let _location = resHdrNew.get('location')
        if (checkUrl(_location))
            resHdrNew.set('location', PREFIX + _location)
        else {
            reqInit.redirect = 'follow'
            return proxy(event, newUrl(_location), reqInit)
        }
    }
    resHdrNew.set('access-control-expose-headers', '*')
    resHdrNew.set('access-control-allow-origin', '*')

    resHdrNew.delete('content-security-policy')
    resHdrNew.delete('content-security-policy-report-only')
    resHdrNew.delete('clear-site-data')

    const response = new Response(res.body, {
        status,
        headers: resHdrNew,
    })

    // 5. cache the response
    const ttl = getCacheTTL(urlObj.href)
    if (ttl > 0) {
        putCache(event, req, response, ttl)
        putKV(event, urlObj.href, response, getKVTTL(urlObj.href))
    }

    return response
}
