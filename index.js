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

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>GitHub 鏂囦欢鍔犻€?/title>
<style>
*,:after,:before{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f5f7fa;color:#1a1a2e;padding:20px}
@media(prefers-color-scheme:dark){body{background:#0f0f1a;color:#e0e0e0}}
.container{width:100%;max-width:680px;text-align:center}
.logo{font-size:2rem;font-weight:800;margin-bottom:8px;background:linear-gradient(135deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.subtitle{font-size:.95rem;color:#888;margin-bottom:32px}
.input-wrap{display:flex;gap:8px;margin-bottom:28px;flex-wrap:wrap}
.input-wrap input{flex:1;min-width:0;padding:14px 18px;border:2px solid #e0e0e0;border-radius:12px;font-size:15px;background:#fff;color:#1a1a2e;outline:none}
.input-wrap input:focus{border-color:#667eea;box-shadow:0 0 0 4px rgba(102,126,234,.15)}
@media(prefers-color-scheme:dark){.input-wrap input{background:#1a1a2e;border-color:#333;color:#e0e0e0}}
.input-wrap button{padding:14px 28px;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;white-space:nowrap}
.input-wrap button:hover{box-shadow:0 4px 20px rgba(102,126,234,.4)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:12px}
.card{background:#fff;border-radius:12px;padding:16px;text-align:left;border:1px solid #eef0f5;cursor:pointer}
.card:hover{border-color:#667eea}
.card .label{font-size:12px;color:#888;margin-bottom:4px}
.card .value{font-size:13px;word-break:break-all}
@media(prefers-color-scheme:dark){.card{background:#1a1a2e;border-color:#2a2a3e}}
.card .value code{background:#f0f0f5;padding:1px 5px;border-radius:4px;font-size:12px}
@media(prefers-color-scheme:dark){.card .value code{background:#2a2a3e;color:#ccc}}
.footer{margin-top:40px;font-size:13px;color:#888}
.footer a{color:#667eea;text-decoration:none}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:rgba(102,126,234,.12);color:#667eea;margin-bottom:16px}
</style>
</head>
<body>
<div class="container">
<div class="badge">CF Worker 浼樺寲鐗?/div>
<div class="logo">GitHub 鏂囦欢鍔犻€?/div>
<p class="subtitle">绮樿创 GitHub 鏂囦欢閾炬帴锛屼竴閿姞閫熶笅杞?/p>
<form id="form" class="input-wrap" action="./" method="get" target="_blank">
<input type="text" name="q" placeholder="https://github.com/owner/repo/..." required>
<button type="submit">鍔犻€熶笅杞?/button>
</form>
<div class="cards">
<div class="card" onclick="document.forms[0].q.value='https://github.com/user/repo/archive/master.zip';document.forms[0].submit()">
<div class="label">鍒嗘敮婧愮爜</div>
<div class="value"><code>/user/repo/archive/master.zip</code></div>
</div>
<div class="card" onclick="document.forms[0].q.value='https://github.com/user/repo/archive/v1.0.0.tar.gz';document.forms[0].submit()">
<div class="label">Release 婧愮爜</div>
<div class="value"><code>/user/repo/archive/v1.0.0.tar.gz</code></div>
</div>
<div class="card" onclick="document.forms[0].q.value='https://github.com/user/repo/releases/download/v1.0.0/app.zip';document.forms[0].submit()">
<div class="label">Release 鏂囦欢</div>
<div class="value"><code>/user/repo/releases/download/v1.0.0/app.zip</code></div>
</div>
<div class="card" onclick="document.forms[0].q.value='https://github.com/user/repo/blob/main/README.md';document.forms[0].submit()">
<div class="label">鍒嗘敮鏂囦欢</div>
<div class="value"><code>/user/repo/blob/main/README.md</code></div>
</div>
</div>
<div class="footer">鍩轰簬 <a href="https://github.com/wei1104/gh-proxy">wei1104/gh-proxy</a> &middot; Cloudflare Workers</div>
</div>
</body>
</html>`

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request, event))
})

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

async function handleRequest(req, event) {
  const url = new URL(req.url)
  let path = url.searchParams.get('q')
  if (path) {
    return Response.redirect(url.origin + PREFIX + path, 301)
  }

  path = url.href.slice(url.origin.length + PREFIX.length)
  path = normalizeUrl(path)

  if (!matchPath(path)) {
    return makeRes(HTML, 200, { 'content-type': 'text/html;charset=utf-8' })
  }

  if (req.method === 'OPTIONS' && req.headers.has('access-control-request-headers')) {
    return new Response(null, PREFLIGHT_INIT)
  }

  return proxy(req, path, event)
}

async function proxy(req, pathname, event) {
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
    event.waitUntil(cacheResponse(urlObj.href, clone))
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
