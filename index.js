const ASSET_URL = 'https://hunshcn.github.io/gh-proxy/'
const PREFIX = '/'
const CACHE_TTL = 300

const Config = {
  jsdelivr: 0
}

const whiteList = []

const PATTERNS = [
  /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:releases|archive)\/.*$/i,
  /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:blob|raw)\/.*$/i,
  /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:info|git-).*$/i,
  /^(?:https?:\/\/)?raw\.(?:githubusercontent|github)\.com\/.+?\/.+?\/.+?\/.+$/i,
  /^(?:https?:\/\/)?gist\.(?:githubusercontent|github)\.com\/.+?\/.+?\/.+$/i,
  /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/tags.*$/i,
  /^(?:https?:\/\/)?objects\.githubusercontent\.com\/.*$/i,
]

const PREFLIGHT_INIT = {
  status: 204,
  headers: {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS',
    'access-control-max-age': '1728000',
  },
}

function matchPath(path) {
  return PATTERNS.some(p => p.test(path))
}

function makeRes(body, status = 200, headers = {}) {
  headers['access-control-allow-origin'] = '*'
  return new Response(body, { status, headers })
}

function normalizeUrl(raw) {
  let url = raw.replace(/^https?:\/\/+/, 'https://')
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  return url
}

function checkWhiteList(urlStr) {
  if (!whiteList.length) return true
  return whiteList.some(i => urlStr.includes(i))
}

export default {
  async fetch(req, env, ctx) {
    try {
      return await handleRequest(req, ctx)
    } catch (err) {
      return makeRes(err.stack, 502)
    }
  },
}

async function handleRequest(req, ctx) {
  const url = new URL(req.url)
  let path = url.searchParams.get('q')
  if (path) {
    return Response.redirect(`${url.origin}${PREFIX}${path}`, 301)
  }

  path = url.href.slice(url.origin.length + PREFIX.length)
  path = normalizeUrl(path)

  if (!matchPath(path)) {
    return fetch(ASSET_URL + url.pathname)
  }

  if (req.method === 'OPTIONS' && req.headers.has('access-control-request-headers')) {
    return new Response(null, PREFLIGHT_INIT)
  }

  return proxy(req, path, ctx)
}

async function proxy(req, pathname, ctx) {
  if (!checkWhiteList(pathname)) {
    return new Response('blocked', { status: 403 })
  }

  const urlObj = new URL(normalizeUrl(pathname))

  if (req.method === 'GET' && !req.headers.get('range')) {
    const cache = await caches.open('gh-proxy')
    const cached = await cache.match(urlObj.href)
    if (cached) return cached
  }

  const reqHeaders = new Headers(req.headers)
  reqHeaders.delete('host')

  const init = {
    method: req.method,
    headers: reqHeaders,
    redirect: 'manual',
    body: req.method === 'GET' || req.method === 'HEAD' ? null : req.body,
  }

  let res = await fetch(urlObj.href, init)

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location')
    if (location) {
      if (matchPath(location)) {
        res.headers.set('location', PREFIX + location)
        return buildResponse(res)
      }
      init.redirect = 'follow'
      res = await fetch(new URL(location, urlObj).href, init)
    }
  }

  if (req.method === 'GET' && !req.headers.get('range') && res.status === 200) {
    const clone = res.clone()
    ctx.waitUntil(cacheResponse(urlObj.href, clone))
  }

  return buildResponse(res)
}

async function cacheResponse(key, res) {
  const cc = res.headers.get('cache-control') || ''
  if (cc.includes('no-store')) return
  const cache = await caches.open('gh-proxy')
  const body = await res.arrayBuffer()
  const headers = new Headers(res.headers)
  headers.set('cache-control', `public, max-age=${CACHE_TTL}`)
  await cache.put(key, new Response(body, { status: res.status, headers }))
}

function buildResponse(res) {
  const headers = new Headers(res.headers)
  headers.set('access-control-allow-origin', '*')
  headers.set('access-control-expose-headers', '*')
  headers.delete('content-security-policy')
  headers.delete('content-security-policy-report-only')
  headers.delete('clear-site-data')
  return new Response(res.body, { status: res.status, headers })
}
