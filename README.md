# gh-proxy (CF Worker 优化版)

## 简介

github release、archive以及项目文件的加速项目，支持clone。基于 [hunshcn/gh-proxy](https://github.com/hunshcn/gh-proxy) 的 Cloudflare Workers 版本进行了性能优化。

## 与原版差异

- **ES Module 格式** — 从 ddEventListener 升级为 export default，Workers 最新推荐
- **边缘缓存** — 引入 CF Cache API，重复请求不再回源，降低计费
- **Range 请求支持** — 支持断点续传和多线程下载
- **新增匹配模式** — 增加 objects.githubusercontent.com 支持（Git LFS 对象存储）
- **路径兼容修复** — 修复 CF Worker 合并 // 导致 URL 错误的问题
- **配置不变** — Config.jsdelivr、whiteList、PREFIX 等配置完全兼容

## 演示

[https://gh.api.99988866.xyz/](https://gh.api.99988866.xyz/)

## 使用

直接在 copy 出来的 url 前加 https://gh.api.99988866.xyz/ 即可

也可以直接访问，在 input 输入

***大量使用请自行部署，以上域名仅为演示使用。***

访问私有仓库可以通过

git clone https://user:TOKEN@ghproxy.com/https://github.com/xxxx/xxxx

以下都是合法输入（仅示例，文件不存在）：

- 分支源码：https://github.com/hunshcn/project/archive/master.zip
- release源码：https://github.com/hunshcn/project/archive/v0.1.0.tar.gz
- release文件：https://github.com/hunshcn/project/releases/download/v0.1.0/example.zip
- 分支文件：https://github.com/hunshcn/project/blob/master/filename
- commit文件：https://github.com/hunshcn/project/blob/1111111111111111111111111111/filename
- gist：https://gist.githubusercontent.com/cielpy/351557e6e465c12986419ac5a4dd2568/raw/cmd.py

## cf worker版本部署

首页：https://workers.cloudflare.com

注册，登陆，Start building，取一个子域名，Create a Worker。

复制 [index.js](index.js) 到左侧代码框，Save and deploy。如果正常，右侧应显示首页。

ASSET_URL 是静态资源的 url（实际上就是现在显示出来的那个输入框单页面）

PREFIX 是前缀，默认（根路径情况为 "/"），如果自定义路由为 example.com/gh/*，请将 PREFIX 改为 '/gh/'，注意，少一个杠都会错！

## Cloudflare Workers计费

到 overview 页面可参看使用情况。免费版每天有 10 万次免费请求，并且有每分钟1000次请求的限制。

## Changelog

### 2026.07.27 优化版
- 升级为 ES Module 格式 (export default)
- 增加 CF Cache API 边缘缓存，减少回源
- 支持 Range 请求头，支持断点续传
- 增加 objects.githubusercontent.com 匹配（Git LFS）
- 修复路径合并 bug
- 精简代码至 144 行

### 原版历史
- 2020.04.10 增加对 aw.githubusercontent.com 文件的支持
- 2020.04.09 增加 Python 版本（使用 Flask）
- 2020.03.23 新增了 clone 的支持
- 2020.03.22 初始版本

## 参考

[jsproxy](https://github.com/EtherDream/jsproxy/)