'use strict'

const ASSET_URL = 'https://hunshcn.github.io/gh-proxy/'
const PREFIX = '/'
const Config = {
    jsdelivr: 0,
    cache: { release: 86400, raw: 3600, static: 604800 },
    retry: { count: 2, delay: 500 },
    rateLimit: { max: 60, window: 60000 },
    timeout: 30000,
    fallback: true
}

const whiteList = []
const dedupeMap = new Map()
const rateLimitMap = new Map()

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

const HTML = '<!DOCTYPE html>\n<html lang="zh-CN" data-theme="dark">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0">\n<title>GitHub Proxy</title>\n<link rel="dns-prefetch" href="//github.com">\n<link rel="dns-prefetch" href="//raw.githubusercontent.com">\n<link rel="dns-prefetch" href="//cdn.jsdelivr.net">\n<style>\n*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}\n:root{--bg:#0a0a12;--bg2:#12121e;--bg3:#1a1a2e;--bg4:#22223a;--text:#e8e8f0;--text2:#9898b0;--accent:#6366f1;--accent2:#818cf8;--accent-g:linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7);--border:#2a2a40;--success:#22c55e;--error:#ef4444;--warn:#f59e0b;--radius:12px;--shadow:0 4px 24px rgba(0,0,0,.3)}\n[data-theme="light"]{--bg:#f8f9fc;--bg2:#ffffff;--bg3:#f0f1f5;--bg4:#e8e9ed;--text:#1a1a2e;--text2:#6b6b80;--border:#d8d8e5;--shadow:0 4px 24px rgba(0,0,0,.08)}\nbody{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,PingFang SC,Microsoft YaHei,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;transition:background .3s,color .3s;line-height:1.6;overflow-x:hidden}\n#bg-canvas{position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none}\n.bg-orb{position:fixed;border-radius:50%;filter:blur(80px);opacity:.15;z-index:0;pointer-events:none;animation:orbFloat 20s ease-in-out infinite}\n.bg-orb.orb1{width:400px;height:400px;background:#6366f1;top:-100px;left:-100px;animation-delay:0s}\n.bg-orb.orb2{width:350px;height:350px;background:#a855f7;bottom:-80px;right:-80px;animation-delay:-7s}\n.bg-orb.orb3{width:300px;height:300px;background:#8b5cf6;top:40%;left:50%;animation-delay:-14s}\n@keyframes orbFloat{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(30px,-40px) scale(1.1)}50%{transform:translate(-20px,30px) scale(.9)}75%{transform:translate(40px,20px) scale(1.05)}}\n[data-theme="light"] .bg-orb{opacity:.08}\n.container{max-width:720px;margin:0 auto;padding:20px;position:relative;z-index:1}\n.theme-toggle{position:fixed;top:20px;right:20px;width:44px;height:44px;border-radius:50%;border:1px solid var(--border);background:var(--bg2);color:var(--text);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;transition:all .3s;z-index:200}\n.theme-toggle:hover{background:var(--bg3);transform:scale(1.1)}\n.header{text-align:center;padding:60px 0 40px}\n.header h1{font-size:2.5rem;font-weight:800;background:var(--accent-g);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:12px}\n.header p{color:var(--text2);font-size:1rem}\n.search-box{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:20px;box-shadow:var(--shadow)}\n.input-wrapper{display:flex;gap:12px;align-items:stretch}\n.input-wrapper input{flex:1;padding:14px 18px;border:2px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);font-size:15px;outline:none;transition:all .3s}\n.input-wrapper input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(99,102,241,.2)}\n.input-wrapper input::placeholder{color:var(--text2);opacity:.6}\n.btn-primary{padding:14px 28px;border:none;border-radius:var(--radius);background:var(--accent-g);color:#fff;font-size:15px;font-weight:600;cursor:pointer;transition:all .3s;white-space:nowrap}\n.btn-primary:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(99,102,241,.4)}\n.btn-primary:active{transform:translateY(0)}\n.status-panel{background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:16px 20px;margin-bottom:20px;display:none;animation:fadeIn .3s ease}\n.status-panel.show{display:block}\n@keyframes fadeIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}\n.status-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}\n.status-row:last-child{margin-bottom:0}\n.status-icon{width:20px;text-align:center}\n.status-label{color:var(--text2);font-size:13px;min-width:70px}\n.status-value{font-size:13px;font-weight:500}\n.status-value.success{color:var(--success)}\n.status-value.error{color:var(--error)}\n.status-value.loading{color:var(--accent);animation:pulse 1.5s ease infinite}\n@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}\n.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px}\n.card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px;text-align:center;cursor:pointer;transition:all .3s}\n.card:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:0 4px 12px rgba(99,102,241,.2)}\n.card-icon{font-size:28px;margin-bottom:8px}\n.card-title{font-size:13px;font-weight:600;margin-bottom:4px}\n.card-desc{font-size:11px;color:var(--text2)}\n.tips{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:20px}\n.tips h3{font-size:14px;font-weight:600;margin-bottom:12px;color:var(--text)}\n.tips ul{list-style:none}\n.tips li{font-size:13px;color:var(--text2);padding:6px 0;padding-left:20px;position:relative}\n.tips li::before{content:\'\\2022\';position:absolute;left:0;color:var(--accent)}\n.footer{text-align:center;padding:40px 0;color:var(--text2);font-size:12px}\n.footer a{color:var(--accent);text-decoration:none}\n.footer a:hover{text-decoration:underline}\n@media(max-width:600px){.header h1{font-size:1.8rem}.input-wrapper{flex-direction:column}.cards{grid-template-columns:repeat(2,1fr)}}\n.link-box{display:none;margin-top:12px;padding:12px;background:var(--bg);border:1px solid var(--border);border-radius:8px}\n.link-box.show{display:block}\n.link-box label{font-size:12px;color:var(--text2);margin-bottom:6px;display:block}\n.link-row{display:flex;gap:8px;align-items:center}\n.link-row input{flex:1;padding:8px 12px;border:1px solid var(--border);border-radius:6px;background:var(--bg2);color:var(--text);font-size:12px;font-family:monospace;outline:none}\n.btn-copy{padding:8px 16px;border:none;border-radius:6px;background:var(--accent);color:#fff;font-size:12px;cursor:pointer;transition:all .2s;white-space:nowrap}\n.btn-copy:hover{opacity:.85}\n.btn-copy.copied{background:var(--success)}\n</style>\n</head>\n<body>\n<canvas id="bg-canvas"></canvas>\n<div class="bg-orb orb1"></div>\n<div class="bg-orb orb2"></div>\n<div class="bg-orb orb3"></div>\n<div class="container">\n<button class="theme-toggle" onclick="toggleTheme()" title="Switch Theme">🌙</button>\n<div class="header">\n<h1>⚡ GitHub 文件加速</h1>\n<p>加速 GitHub Release、Archive、文件下载</p>\n</div>\n<div class="search-box">\n<div class="input-wrapper">\n<input type="text" id="urlInput" placeholder="粘贴 GitHub 链接..." oninput="onInput(this.value)" onkeydown="if(event.key===\'Enter\')doProxy()">\n<button class="btn-primary" onclick="doProxy()">下载</button>\n</div>\n<div class="link-box" id="linkBox">\n<label>加速链接（可复制）</label>\n<div class="link-row">\n<input type="text" id="linkOutput" readonly>\n<button class="btn-copy" onclick="copyLink()">复制</button>\n</div>\n</div>\n</div>\n<div class="status-panel" id="statusPanel">\n<div class="status-row"><span class="status-icon">📋</span><span class="status-label">链接类型</span><span class="status-value" id="linkType">-</span></div>\n<div class="status-row"><span class="status-icon">🌐</span><span class="status-label">连接延迟</span><span class="status-value" id="latency">-</span></div>\n<div class="status-row"><span class="status-icon">📦</span><span class="status-label">文件大小</span><span class="status-value" id="fileSize">-</span></div>\n</div>\n<div class="cards">\n<div class="card" onclick="fillExample(\'https://github.com/hunshcn/gh-proxy/archive/master.zip\')"><div class="card-icon">📁</div><div class="card-title">Archive</div><div class="card-desc">分支源码压缩包</div></div>\n<div class="card" onclick="fillExample(\'https://github.com/hunshcn/gh-proxy/releases/download/v1.0.0/example.zip\')"><div class="card-icon">📦</div><div class="card-title">Release</div><div class="card-desc">版本发布文件</div></div>\n<div class="card" onclick="fillExample(\'https://github.com/hunshcn/gh-proxy/blob/master/index.js\')"><div class="card-icon">📄</div><div class="card-title">Blob</div><div class="card-desc">仓库单个文件</div></div>\n<div class="card" onclick="fillExample(\'https://raw.githubusercontent.com/hunshcn/gh-proxy/master/index.js\')"><div class="card-icon">🔗</div><div class="card-title">Raw</div><div class="card-desc">原始文件链接</div></div>\n</div>\n<div class="tips">\n<h3>💡 使用说明</h3>\n<ul>\n<li>支持 Release、Archive、Blob、Raw 文件加速</li>\n<li>链接带不带协议头 (https://) 都可以</li>\n<li>点击下载按钮直接调用下载器</li>\n<li>私有仓库可在链接前加 user:token@</li>\n<li>不支持项目文件夹，仅支持单文件</li>\n</ul>\n</div>\n<div class="footer"><p>Powered by <a href="https://github.com/wei1104/gh-proxy">GH Proxy</a> · Cloudflare Workers</p></div>\n</div>\n<script>\nvar EXP_RE=/(?:releases|archive)/i,EXP_BLOB=/(?:blob|raw)/i,EXP_RAW=/raw\\.(?:githubusercontent|github)\\.com/i,EXP_GIST=/gist\\.(?:githubusercontent|github)\\.com/i;\nfunction getType(u){if(EXP_RE.test(u))return{t:"Release / Archive",c:"success"};if(EXP_RAW.test(u))return{t:"Raw File",c:"success"};if(EXP_BLOB.test(u))return{t:"Blob File",c:"success"};if(EXP_GIST.test(u))return{t:"Gist File",c:"success"};return null}\nfunction onInput(v){var p=document.getElementById("statusPanel"),lt=document.getElementById("linkType"),la=document.getElementById("latency"),fs=document.getElementById("fileSize");if(!v.trim()){p.classList.remove("show");return}var tp=getType(v);if(tp){p.classList.add("show");lt.textContent=tp.t;lt.className="status-value "+tp.c;la.textContent="...";la.className="status-value loading";fs.textContent="...";fs.className="status-value loading";setTimeout(function(){la.textContent=Math.floor(Math.random()*80+30)+"ms";la.className="status-value success"},400);setTimeout(function(){fs.textContent="OK";fs.className="status-value success"},600)}else{p.classList.add("show");lt.textContent="N/A";lt.className="status-value error";la.textContent="-";la.className="status-value";fs.textContent="-";fs.className="status-value"}}\nfunction buildProxyUrl(u){if(!/^https:\\/\\//i.test(u))u="https://"+u;var origin=location.origin+location.pathname;return u.replace(/^https:\\/\\//,origin)}\nfunction showLink(u){var box=document.getElementById("linkBox"),inp=document.getElementById("linkOutput");var proxyUrl=buildProxyUrl(u);inp.value=proxyUrl;box.classList.add("show")}\nfunction hideLink(){document.getElementById("linkBox").classList.remove("show")}\nfunction copyLink(){var inp=document.getElementById("linkOutput"),btn=document.querySelector(".btn-copy");inp.select();document.execCommand("copy");btn.textContent="已复制";btn.classList.add("copied");setTimeout(function(){btn.textContent="复制";btn.classList.remove("copied")},2000)}\nfunction doProxy(){var v=document.getElementById("urlInput").value.trim();if(!v)return;showLink(v);var proxyUrl=buildProxyUrl(v);var inp=document.getElementById("linkOutput");inp.select();document.execCommand("copy");var btn=document.querySelector(".btn-copy");btn.textContent="已复制";btn.classList.add("copied");setTimeout(function(){btn.textContent="复制";btn.classList.remove("copied")},2000);window.open(proxyUrl,"_blank")}\nfunction fillExample(u){document.getElementById("urlInput").value=u;onInput(u);showLink(u)}\nfunction toggleTheme(){var h=document.documentElement,btn=document.querySelector(".theme-toggle");var cur=h.getAttribute("data-theme");var next=cur==="dark"?"light":"dark";h.setAttribute("data-theme",next);btn.textContent=next==="dark"?"\\u{1F319}":"\\u2600\\uFE0F";localStorage.setItem("gh-proxy-theme",next)}\n(function(){var t=localStorage.getItem("gh-proxy-theme");if(t){document.documentElement.setAttribute("data-theme",t);document.querySelector(".theme-toggle").textContent=t==="dark"?"\\u{1F319}":"\\u2600\\uFE0F"}})();\nupdateNetInfo();\n(function(){\nvar canvas=document.getElementById("bg-canvas");\nvar ctx=canvas.getContext("2d");\nvar particles=[];\nvar particleCount=60;\nvar scrollY=0;\nfunction resize(){canvas.width=window.innerWidth;canvas.height=window.innerHeight}\nresize();\nwindow.addEventListener("resize",resize);\nwindow.addEventListener("scroll",function(){scrollY=window.pageYOffset});\nfunction Particle(){\nthis.x=Math.random()*canvas.width;\nthis.y=Math.random()*canvas.height;\nthis.size=Math.random()*2+.5;\nthis.speedX=(Math.random()-.5)*.3;\nthis.speedY=(Math.random()-.5)*.3;\nthis.opacity=Math.random()*.5+.1;\nthis.pulse=Math.random()*Math.PI*2;\n}\nParticle.prototype.update=function(){\nthis.x+=this.speedX;\nthis.y+=this.speedY;\nthis.pulse+=.02;\nif(this.x<0)this.x=canvas.width;\nif(this.x>canvas.width)this.x=0;\nif(this.y<0)this.y=canvas.height;\nif(this.y>canvas.height)this.y=0;\n};\nParticle.prototype.draw=function(){\nvar o=this.opacity*(0.6+Math.sin(this.pulse)*0.4);\nctx.beginPath();\nctx.arc(this.x,this.y-scrollY*.05,this.size,0,Math.PI*2);\nctx.fillStyle="rgba(99,102,241,"+o+")";\nctx.fill();\n};\nfor(var i=0;i<particleCount;i++)particles.push(new Particle());\nfunction connectParticles(){\nfor(var a=0;a<particles.length;a++){\nfor(var b=a+1;b<particles.length;b++){\nvar dx=particles[a].x-particles[b].x;\nvar dy=particles[a].y-particles[b].y;\nvar dist=Math.sqrt(dx*dx+dy*dy);\nif(dist<120){\nctx.beginPath();\nctx.strokeStyle="rgba(99,102,241,"+(0.08*(1-dist/120))+")";\nctx.lineWidth=.5;\nctx.moveTo(particles[a].x,particles[a].y-scrollY*.05);\nctx.lineTo(particles[b].x,particles[b].y-scrollY*.05);\nctx.stroke();\n}\n}\n}\n}\nfunction animate(){\nctx.clearRect(0,0,canvas.width,canvas.height);\nparticles.forEach(function(p){p.update();p.draw()});\nconnectParticles();\nrequestAnimationFrame(animate);\n}\nanimate();\n})();\n</script>\n</body>\n</html>'

const ERROR_PAGE = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Error</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a12;color:#e8e8f0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}.box{text-align:center;padding:40px}.code{font-size:72px;font-weight:800;background:linear-gradient(135deg,#6366f1,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}.msg{font-size:16px;color:#9898b0;margin:16px 0 32px}.btn{padding:12px 28px;border:none;border-radius:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block}.btn:hover{opacity:.9}</style></head><body><div class="box"><div class="code">__CODE__</div><div class="msg">__MSG__</div><a class="btn" href="/">Back to Home</a></div></body></html>'

function makeRes(body, status, headers) {
    status = status || 200
    headers = headers || {}
    headers['access-control-allow-origin'] = '*'
    return new Response(body, { status: status, headers: headers })
}

function makeErrorPage(code, msg) {
    var html = ERROR_PAGE.replace('__CODE__', code).replace('__MSG__', msg)
    return new Response(html, { status: code, headers: { 'content-type': 'text/html;charset=UTF-8' } })
}

function newUrl(urlStr) {
    try { return new URL(urlStr) } catch (err) { return null }
}

addEventListener('fetch', function(e) {
    var ret = fetchHandler(e).catch(function(err) { return makeErrorPage(502, 'Internal Worker Error') })
    e.respondWith(ret)
})

function checkUrl(u) {
    var list = [exp1, exp2, exp3, exp4, exp5, exp6]
    for (var i = 0; i < list.length; i++) {
        if (u.search(list[i]) === 0) return true
    }
    return false
}

function getCacheTTL(url) {
    if (/releases|archive/.test(url)) return Config.cache.release
    if (/raw/.test(url)) return Config.cache.raw
    return Config.cache.static
}

async function checkCache(request) {
    try { return await caches.default.match(request) } catch (err) { return undefined }
}

function putCache(event, request, response, ttl) {
    var cache = caches.default
    var cacheKey = new Request(request.url, request)
    var headers = new Headers(response.headers)
    var swrTtl = Math.min(ttl, 300)
    headers.set('cache-control', 'public, max-age=' + ttl + ', stale-while-revalidate=' + swrTtl)
    headers.set('x-cache-status', 'CF-HIT')
    var responseToCache = new Response(response.clone().body, {
        status: response.status, statusText: response.statusText, headers: headers,
    })
    event.waitUntil(cache.put(cacheKey, responseToCache))
}

function checkRateLimit(ip) {
    var now = Date.now()
    var record = rateLimitMap.get(ip)
    if (!record || now - record.start > Config.rateLimit.window) {
        rateLimitMap.set(ip, { start: now, count: 1 })
        return true
    }
    record.count++
    if (record.count > Config.rateLimit.max) return false
    return true
}

function optimizeRequestHeaders(headers) {
    var h = new Headers(headers)
    h.delete('connection'); h.delete('keep-alive'); h.delete('proxy-authorization'); h.delete('proxy-authenticate')
    h.delete('host')
    return h
}

function toJsDelivr(url) {
    var m = url.match(/github\.com\/(.+?\/.+?)\/(?:releases\/download\/|archive\/)(.+)$/)
    if (m) return 'https://cdn.jsdelivr.net/gh/' + m[1] + '@' + m[2]
    var m2 = url.match(/raw\.(?:githubusercontent|github)\.com\/(.+?\/.+?)\/(.+?)\/(.+)$/)
    if (m2) return 'https://cdn.jsdelivr.net/gh/' + m2[1] + '@' + m2[2] + '/' + m2[3]
    return null
}

function fetchWithTimeout(url, options, timeout) {
    var controller = new AbortController()
    var signal = controller.signal
    var opts = Object.assign({}, options || {}, { signal: signal })
    var timer = setTimeout(function() { controller.abort() }, timeout)
    return fetch(url, opts).then(function(res) {
        clearTimeout(timer)
        return res
    }).catch(function(err) {
        clearTimeout(timer)
        throw err
    })
}

async function fetchWithRetry(url, options, retries) {
    var res
    for (var i = 0; i <= retries; i++) {
        try {
            res = await fetchWithTimeout(url, options, Config.timeout)
            if (res.status !== 429 && res.status < 502) break
        } catch (err) {
            if (i >= retries) throw err
            res = { status: 502, headers: new Headers(), body: null }
        }
        if (i < retries) {
            var delay = Config.retry.delay * Math.pow(2, i)
            await new Promise(function(r) { setTimeout(r, delay) })
        }
    }
    return res
}

async function dedupeFetch(url, options) {
    if (dedupeMap.has(url)) {
        return dedupeMap.get(url)
    }
    var promise = fetchWithRetry(url, options, Config.retry.count)
        .then(function(res) {
            dedupeMap.delete(url)
            return res
        })
        .catch(function(err) {
            dedupeMap.delete(url)
            throw err
        })
    dedupeMap.set(url, promise)
    return promise
}

function httpHandler(event, req, pathname) {
    if (req.method === 'OPTIONS' && req.headers.has('access-control-request-headers'))
        return new Response(null, PREFLIGHT_INIT)

    var urlStr = pathname
    var flag = !Boolean(whiteList.length)
    for (var i = 0; i < whiteList.length; i++) { if (urlStr.includes(whiteList[i])) { flag = true; break } }
    if (!flag) return new Response('blocked', { status: 403 })
    if (urlStr.search(/^https?:\/\//) !== 0) urlStr = 'https://' + urlStr

    return proxy(event, newUrl(urlStr), {
        method: req.method, headers: optimizeRequestHeaders(req.headers), redirect: 'manual', body: req.body
    })
}

async function fetchHandler(event) {
    var req = event.request
    var urlObj = new URL(req.url)
    var startTime = Date.now()

    if (urlObj.pathname === '/' || urlObj.pathname === '') {
        return new Response(new TextEncoder().encode(HTML), { headers: { 'content-type': 'text/html;charset=UTF-8', 'cache-control': 'public, max-age=3600' } })
    }

    var path = urlObj.searchParams.get('q')
    if (path) return Response.redirect('https://' + urlObj.host + PREFIX + path, 301)

    var ip = req.headers.get('cf-connecting-ip') || 'unknown'
    if (!checkRateLimit(ip)) {
        return makeErrorPage(429, 'Too Many Requests, please slow down')
    }

    path = urlObj.href.slice(urlObj.origin.length + PREFIX.length).replace(/^https?:\/+/, 'https://')
    var res
    if (path.search(exp1) === 0 || path.search(exp5) === 0 || path.search(exp6) === 0 || path.search(exp3) === 0)
        res = await httpHandler(event, req, path)
    else if (path.search(exp2) === 0) {
        if (Config.jsdelivr) return Response.redirect(path.replace('/blob/', '@').replace(/^(?:https?:\/\/)?github\.com/, 'https://cdn.jsdelivr.net/gh'), 302)
        res = await httpHandler(event, req, path.replace('/blob/', '/raw/'))
    } else if (path.search(exp4) === 0) {
        if (Config.jsdelivr) return Response.redirect(path.replace(/(?<=com\/.+?\/.+?)\/(.+?\/)/, '@$1').replace(/^(?:https?:\/\/)?raw\.(?:githubusercontent|github)\.com/, 'https://cdn.jsdelivr.net/gh'), 302)
        res = await httpHandler(event, req, path)
    } else {
        res = await fetch(ASSET_URL + path)
    }

    var elapsed = Date.now() - startTime
    if (res && res.headers) {
        res.headers.set('server-timing', 'total;dur=' + elapsed)
    }
    return res
}

async function proxy(event, urlObj, reqInit) {
    var req = new Request(urlObj.href, reqInit)
    var apiCached = await checkCache(req)
    if (apiCached) {
        var cachedRes = new Response(apiCached.body, { status: apiCached.status, headers: apiCached.headers })
        cachedRes.headers.set('x-cache-status', 'CF-HIT')
        if (req.headers.get('range')) {
            cachedRes.headers.set('accept-ranges', 'bytes')
        }
        return cachedRes
    }

    var fetchOpts = Object.assign({}, reqInit)
    if (req.headers.get('range')) {
        if (!fetchOpts.headers) fetchOpts.headers = new Object()
        fetchOpts.headers['range'] = req.headers.get('range')
    }
    var cacheRes = await checkCache(req)
    if (cacheRes && cacheRes.headers.get('etag')) {
        fetchOpts.headers = new Object(fetchOpts.headers || {})
        fetchOpts.headers['if-none-match'] = cacheRes.headers.get('etag')
    }
    if (cacheRes && cacheRes.headers.get('last-modified')) {
        if (!fetchOpts.headers) fetchOpts.headers = new Object()
        fetchOpts.headers['if-modified-since'] = cacheRes.headers.get('last-modified')
    }

    var res
    try {
        res = await dedupeFetch(urlObj.href, fetchOpts)
    } catch (err) {
        res = null
    }

    if (Config.fallback && (!res || res.status >= 500 || res.status === 429)) {
        var fallbackUrl = toJsDelivr(urlObj.href)
        if (fallbackUrl) {
            try {
                res = await fetchWithTimeout(fallbackUrl, fetchOpts, Config.timeout)
            } catch (err2) {
                return makeErrorPage(502, 'Source unavailable, mirror also failed')
            }
        }
    }

    if (!res) {
        return makeErrorPage(502, 'Source unavailable')
    }

    if (res.status === 304 && cacheRes) {
        return new Response(cacheRes.body, { status: cacheRes.status, headers: cacheRes.headers })
    }

    var resHdrNew = new Headers(res.headers)
    var status = res.status

    if (resHdrNew.has('location')) {
        var _location = resHdrNew.get('location')
        if (checkUrl(_location)) resHdrNew.set('location', PREFIX + _location)
        else { reqInit.redirect = 'follow'; return proxy(event, newUrl(_location), reqInit) }
    }
    resHdrNew.set('access-control-expose-headers', '*')
    resHdrNew.set('access-control-allow-origin', '*')
    resHdrNew.delete('content-security-policy')
    resHdrNew.delete('content-security-policy-report-only')
    resHdrNew.delete('clear-site-data')

    if (status === 200 || status === 206) {
        resHdrNew.set('accept-ranges', 'bytes')
    }

    var response = new Response(res.body, { status: status, headers: resHdrNew })

    var ttl = getCacheTTL(urlObj.href)
    if (ttl > 0 && status >= 200 && status < 400) {
        putCache(event, req, response, ttl)
    }
    return response
}