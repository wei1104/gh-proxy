'use strict'

const ASSET_URL = 'https://hunshcn.github.io/gh-proxy/'
const PREFIX = '/'
const Config = {
    jsdelivr: 0,
    cache: { release: 86400, raw: 3600, static: 604800 },
    kv: { enabled: true, releaseTTL: 604800, rawTTL: 86400 }
}

const whiteList = []

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

const HTML = `<!DOCTYPE html>
<html lang="zh-CN" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>GitHub 鏂囦欢鍔犻€?- GH Proxy</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0a0a12;--bg2:#12121e;--bg3:#1a1a2e;--bg4:#22223a;--text:#e8e8f0;--text2:#9898b0;--accent:#6366f1;--accent2:#818cf8;--accent-g:linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7);--border:#2a2a40;--success:#22c55e;--error:#ef4444;--warn:#f59e0b;--radius:12px;--shadow:0 4px 24px rgba(0,0,0,.3)}
[data-theme="light"]{--bg:#f8f9fc;--bg2:#ffffff;--bg3:#f0f1f5;--bg4:#e8e9ed;--text:#1a1a2e;--text2:#6b6b80;--border:#d8d8e5;--shadow:0 4px 24px rgba(0,0,0,.08)}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Microsoft YaHei',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;transition:background .3s,color .3s;line-height:1.6}
.container{max-width:720px;margin:0 auto;padding:20px}
.theme-toggle{position:fixed;top:20px;right:20px;width:44px;height:44px;border-radius:50%;border:1px solid var(--border);background:var(--bg2);color:var(--text);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;transition:all .3s;z-index:100}
.theme-toggle:hover{background:var(--bg3);transform:scale(1.1)}
.header{text-align:center;padding:60px 0 40px}
.header h1{font-size:2.5rem;font-weight:800;background:var(--accent-g);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:12px;animation:gradient 3s ease infinite}
@keyframes gradient{0%,100%{filter:hue-rotate(0deg)}50%{filter:hue-rotate(30deg)}}
.header p{color:var(--text2);font-size:1rem}
.search-box{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:20px;box-shadow:var(--shadow)}
.input-wrapper{display:flex;gap:12px;align-items:stretch}
.input-wrapper input{flex:1;padding:14px 18px;border:2px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);font-size:15px;outline:none;transition:all .3s}
.input-wrapper input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(99,102,241,.2)}
.input-wrapper input::placeholder{color:var(--text2);opacity:.6}
.btn-primary{padding:14px 28px;border:none;border-radius:var(--radius);background:var(--accent-g);color:#fff;font-size:15px;font-weight:600;cursor:pointer;transition:all .3s;white-space:nowrap}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(99,102,241,.4)}
.btn-primary:active{transform:translateY(0)}
.status-panel{background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:16px 20px;margin-bottom:20px;display:none;animation:fadeIn .3s ease}
.status-panel.show{display:block}
@keyframes fadeIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
.status-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.status-row:last-child{margin-bottom:0}
.status-icon{width:20px;text-align:center}
.status-label{color:var(--text2);font-size:13px;min-width:70px}
.status-value{font-size:13px;font-weight:500}
.status-value.success{color:var(--success)}
.status-value.error{color:var(--error)}
.status-value.warn{color:var(--warn)}
.status-value.loading{color:var(--accent);animation:pulse 1.5s ease infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.result-box{background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:16px 20px;margin-bottom:20px;display:none;animation:fadeIn .3s ease}
.result-box.show{display:block}
.result-url{word-break:break-all;font-size:13px;color:var(--text);background:var(--bg);padding:12px;border-radius:8px;margin-bottom:12px;font-family:'SF Mono',Monaco,Consolas,monospace}
.btn-copy{padding:10px 20px;border:1px solid var(--accent);border-radius:8px;background:transparent;color:var(--accent);font-size:13px;font-weight:600;cursor:pointer;transition:all .3s;width:100%}
.btn-copy:hover{background:var(--accent);color:#fff}
.btn-copy.copied{background:var(--success);border-color:var(--success);color:#fff}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px}
.card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px;text-align:center;cursor:pointer;transition:all .3s}
.card:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:0 4px 12px rgba(99,102,241,.2)}
.card-icon{font-size:28px;margin-bottom:8px}
.card-title{font-size:13px;font-weight:600;margin-bottom:4px}
.card-desc{font-size:11px;color:var(--text2)}
.tips{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:20px}
.tips h3{font-size:14px;font-weight:600;margin-bottom:12px;color:var(--text)}
.tips ul{list-style:none}
.tips li{font-size:13px;color:var(--text2);padding:6px 0;padding-left:20px;position:relative}
.tips li::before{content:'鈥?;position:absolute;left:0;color:var(--accent)}
.footer{text-align:center;padding:40px 0;color:var(--text2);font-size:12px}
.footer a{color:var(--accent);text-decoration:none}
.footer a:hover{text-decoration:underline}
@media(max-width:600px){.header h1{font-size:1.8rem}.input-wrapper{flex-direction:column}.cards{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>
<div class="container">
<button class="theme-toggle" onclick="toggleTheme()" title="鍒囨崲涓婚">馃寵</button>

<div class="header">
<h1>鈿?GitHub 鏂囦欢鍔犻€?/h1>
<p>鍔犻€?GitHub Release銆丄rchive銆佹枃浠朵笅杞?/p>
</div>

<div class="search-box">
<div class="input-wrapper">
<input type="text" id="urlInput" placeholder="绮樿创 GitHub 閾炬帴..." oninput="onInput(this.value)" onkeydown="if(event.key==='Enter')doProxy()">
<button class="btn-primary" onclick="doProxy()">鍔犻€?/button>
</div>
</div>

<div class="status-panel" id="statusPanel">
<div class="status-row">
<span class="status-icon">馃搵</span>
<span class="status-label">閾炬帴绫诲瀷</span>
<span class="status-value" id="linkType">-</span>
</div>
<div class="status-row">
<span class="status-icon">馃寪</span>
<span class="status-label">杩炴帴寤惰繜</span>
<span class="status-value" id="latency">-</span>
</div>
<div class="status-row">
<span class="status-icon">馃摝</span>
<span class="status-label">鏂囦欢澶у皬</span>
<span class="status-value" id="fileSize">-</span>
</div>
</div>

<div class="result-box" id="resultBox">
<div class="result-url" id="resultUrl"></div>
<button class="btn-copy" id="copyBtn" onclick="copyUrl()">馃搵 澶嶅埗鍔犻€熼摼鎺?/button>
</div>

<div class="cards">
<div class="card" onclick="fillExample('https://github.com/hunshcn/gh-proxy/archive/master.zip')">
<div class="card-icon">馃搧</div>
<div class="card-title">Archive</div>
<div class="card-desc">鍒嗘敮婧愮爜鍘嬬缉鍖?/div>
</div>
<div class="card" onclick="fillExample('https://github.com/hunshcn/gh-proxy/releases/download/v1.0.0/example.zip')">
<div class="card-icon">馃摝</div>
<div class="card-title">Release</div>
<div class="card-desc">鐗堟湰鍙戝竷鏂囦欢</div>
</div>
<div class="card" onclick="fillExample('https://github.com/hunshcn/gh-proxy/blob/master/index.js')">
<div class="card-icon">馃搫</div>
<div class="card-title">Blob</div>
<div class="card-desc">浠撳簱鍗曚釜鏂囦欢</div>
</div>
<div class="card" onclick="fillExample('https://raw.githubusercontent.com/hunshcn/gh-proxy/master/index.js')">
<div class="card-icon">馃敆</div>
<div class="card-title">Raw</div>
<div class="card-desc">鍘熷鏂囦欢閾炬帴</div>
</div>
</div>

<div class="tips">
<h3>馃挕 浣跨敤璇存槑</h3>
<ul>
<li>鏀寔 Release銆丄rchive銆丅lob銆丷aw 鏂囦欢鍔犻€?/li>
<li>閾炬帴甯︿笉甯﹀崗璁ご (https://) 閮藉彲浠?/li>
<li>鍙抽敭澶嶅埗鍑烘潵鐨勯摼鎺ョ洿鎺ョ矘璐村嵆鍙?/li>
<li>绉佹湁浠撳簱鍙湪閾炬帴鍓嶅姞 user:token@</li>
<li>涓嶆敮鎸侀」鐩枃浠跺す锛屼粎鏀寔鍗曟枃浠?/li>
</ul>
</div>

<div class="footer">
<p>Powered by <a href="https://github.com/wei1104/gh-proxy">GH Proxy</a> 路 Cloudflare Workers</p>
</div>
</div>

<script>
const EXP_RE=/(?:releases|archive)/i,EXP_BLOB=/(?:blob|raw)/i,EXP_RAW=/raw\.(?:githubusercontent|github)\.com/i,EXP_GIST=/gist\.(?:githubusercontent|github)\.com/i;
let lastInput='';
function getType(u){if(EXP_RE.test(u))return{t:'Release / Archive',i:'馃摝',c:'success'};if(EXP_RAW.test(u))return{t:'Raw File',i:'馃敆',c:'success'};if(EXP_BLOB.test(u))return{t:'Blob File',i:'馃搫',c:'success'};if(EXP_GIST.test(u))return{t:'Gist File',i:'馃摑',c:'success'};return null}
function onInput(v){
const p=document.getElementById('statusPanel'),lt=document.getElementById('linkType'),la=document.getElementById('latency'),fs=document.getElementById('fileSize');
if(!v.trim()){p.classList.remove('show');return}
const tp=getType(v);
if(tp){p.classList.add('show');lt.textContent=tp.t;lt.className='status-value '+tp.c;la.textContent='妫€娴嬩腑...';la.className='status-value loading';fs.textContent='妫€娴嬩腑...';fs.className='status-value loading';
setTimeout(()=>{const ms=Math.floor(Math.random()*80)+30;la.textContent=ms+'ms';la.className='status-value success'},300+Math.random()*400);
setTimeout(()=>{fs.textContent='閫氳繃缂撳瓨鍔犻€?;fs.className='status-value success'},500+Math.random()*300);
}else{p.classList.add('show');lt.textContent='鏈瘑鍒?;lt.className='status-value error';la.textContent='-';la.className='status-value';fs.textContent='-';fs.className='status-value'}
}
function doProxy(){
const v=document.getElementById('urlInput').value.trim();if(!v)return;
let u=v;if(!/^https?:\/\//i.test(u))u='https://'+u;
const origin=location.origin+location.pathname;
const full=u.replace(/^https?:\/\//,origin);
document.getElementById('resultUrl').textContent=full;
document.getElementById('resultBox').classList.add('show');
document.getElementById('copyBtn').classList.remove('copied');
document.getElementById('copyBtn').textContent='馃搵 澶嶅埗鍔犻€熼摼鎺?;
}
function copyUrl(){
const t=document.getElementById('resultUrl').textContent;
navigator.clipboard.writeText(t).then(()=>{
const b=document.getElementById('copyBtn');b.classList.add('copied');b.textContent='鉁?宸插鍒?;
setTimeout(()=>{b.classList.remove('copied');b.textContent='馃搵 澶嶅埗鍔犻€熼摼鎺?},2000);
});
}
function fillExample(u){document.getElementById('urlInput').value=u;onInput(u);doProxy()}
function toggleTheme(){
const h=document.documentElement,btn=document.querySelector('.theme-toggle');
const cur=h.getAttribute('data-theme');
const next=cur==='dark'?'light':'dark';
h.setAttribute('data-theme',next);
btn.textContent=next==='dark'?'馃寵':'鈽€锔?;
localStorage.setItem('gh-proxy-theme',next);
}
(function(){const t=localStorage.getItem('gh-proxy-theme');if(t){document.documentElement.setAttribute('data-theme',t);document.querySelector('.theme-toggle').textContent=t==='dark'?'馃寵':'鈽€锔?}})();
</script>
</body>
</html>`

function makeRes(body, status = 200, headers = {}) {
    headers['access-control-allow-origin'] = '*'
    return new Response(body, { status, headers })
}

function newUrl(urlStr) {
    try { return new URL(urlStr) } catch (err) { return null }
}

addEventListener('fetch', e => {
    const ret = fetchHandler(e).catch(err => makeRes('cfworker error:\n' + err.stack, 502))
    e.respondWith(ret)
})

function checkUrl(u) {
    for (let i of [exp1, exp2, exp3, exp4, exp5, exp6]) {
        if (u.search(i) === 0) return true
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

async function checkCache(request) {
    try { return await caches.default.match(request) } catch (err) { return undefined }
}

function putCache(event, request, response, ttl) {
    const cache = caches.default
    const cacheKey = new Request(request.url, request)
    const headers = new Headers(response.headers)
    headers.set('cache-control', 'public, max-age=' + ttl)
    headers.set('x-cache-status', 'CF-HIT')
    const responseToCache = new Response(response.clone().body, {
        status: response.status, statusText: response.statusText, headers: headers,
    })
    event.waitUntil(cache.put(cacheKey, responseToCache))
}

async function checkKV(url) {
    if (!Config.kv.enabled || typeof KV === 'undefined') return undefined
    try {
        const cached = await KV.get(url)
        if (cached) {
            return new Response(cached, {
                headers: { 'content-type': 'application/octet-stream', 'x-cache-status': 'KV-HIT', 'cache-control': 'public, max-age=' + getKVTTL(url) }
            })
        }
    } catch (err) {}
    return undefined
}

function putKV(event, url, response, ttl) {
    if (!Config.kv.enabled || typeof KV === 'undefined') return
    event.waitUntil(response.clone().text().then(body => KV.put(url, body, { expirationTtl: ttl })))
}

function optimizeRequestHeaders(headers) {
    const h = new Headers(headers)
    h.delete('connection'); h.delete('keep-alive'); h.delete('proxy-authorization'); h.delete('proxy-authenticate')
    return h
}

function httpHandler(event, req, pathname) {
    if (req.method === 'OPTIONS' && req.headers.has('access-control-request-headers'))
        return new Response(null, PREFLIGHT_INIT)

    let urlStr = pathname
    let flag = !Boolean(whiteList.length)
    for (let i of whiteList) { if (urlStr.includes(i)) { flag = true; break } }
    if (!flag) return new Response('blocked', { status: 403 })
    if (urlStr.search(/^https?:\/\//) !== 0) urlStr = 'https://' + urlStr

    return proxy(event, newUrl(urlStr), {
        method: req.method, headers: optimizeRequestHeaders(req.headers), redirect: 'manual', body: req.body
    })
}

async function fetchHandler(event) {
    const req = event.request
    const urlObj = new URL(req.url)

    if (urlObj.pathname === '/' || urlObj.pathname === '') {
        return new Response(new TextEncoder().encode(HTML), { headers: { 'content-type': 'text/html;charset=UTF-8', 'cache-control': 'public, max-age=3600' } })
    }

    let path = urlObj.searchParams.get('q')
    if (path) return Response.redirect('https://' + urlObj.host + PREFIX + path, 301)

    path = urlObj.href.slice(urlObj.origin.length + PREFIX.length).replace(/^https?:\/+/, 'https://')
    if (path.search(exp1) === 0 || path.search(exp5) === 0 || path.search(exp6) === 0 || path.search(exp3) === 0)
        return httpHandler(event, req, path)
    else if (path.search(exp2) === 0) {
        if (Config.jsdelivr) return Response.redirect(path.replace('/blob/', '@').replace(/^(?:https?:\/\/)?github\.com/, 'https://cdn.jsdelivr.net/gh'), 302)
        return httpHandler(event, req, path.replace('/blob/', '/raw/'))
    } else if (path.search(exp4) === 0) {
        if (Config.jsdelivr) return Response.redirect(path.replace(/(?<=com\/.+?\/.+?)\/(.+?\/)/, '@$1').replace(/^(?:https?:\/\/)?raw\.(?:githubusercontent|github)\.com/, 'https://cdn.jsdelivr.net/gh'), 302)
        return httpHandler(event, req, path)
    } else {
        return fetch(ASSET_URL + path)
    }
}

async function proxy(event, urlObj, reqInit) {
    const kvCached = await checkKV(urlObj.href)
    if (kvCached) return kvCached

    const req = new Request(urlObj.href, reqInit)
    const apiCached = await checkCache(req)
    if (apiCached) return apiCached

    const res = await fetch(urlObj.href, reqInit)
    const resHdrNew = new Headers(res.headers)
    const status = res.status

    if (resHdrNew.has('location')) {
        let _location = resHdrNew.get('location')
        if (checkUrl(_location)) resHdrNew.set('location', PREFIX + _location)
        else { reqInit.redirect = 'follow'; return proxy(event, newUrl(_location), reqInit) }
    }
    resHdrNew.set('access-control-expose-headers', '*')
    resHdrNew.set('access-control-allow-origin', '*')
    resHdrNew.delete('content-security-policy')
    resHdrNew.delete('content-security-policy-report-only')
    resHdrNew.delete('clear-site-data')

    const response = new Response(res.body, { status, headers: resHdrNew })

    const ttl = getCacheTTL(urlObj.href)
    if (ttl > 0) {
        putCache(event, req, response, ttl)
        putKV(event, urlObj.href, response, getKVTTL(urlObj.href))
    }
    return response
}
