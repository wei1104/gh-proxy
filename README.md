# gh-proxy (CF Worker 优化版)

## 简介

github release、archive以及项目文件的加速项目，支持clone。基于 [hunshcn/gh-proxy](https://github.com/hunshcn/gh-proxy) 的 Cloudflare Workers 版本进行了全面优化。

## 优化内容

- **全新前端 UI** — 现代化卡片式设计，支持深色模式自适应，交互更友好
- **内嵌页面** — 前端页面直接内嵌在 Worker 中，无需外部 ASSET_URL 依赖，部署即用
- **边缘缓存** — 引入 CF Cache API，重复请求不再回源，降低计费
- **Range 请求支持** — 支持断点续传和多线程下载
- **更多匹配模式** — 增加 objects.githubusercontent.com（Git LFS 对象存储）
- **ES Module 格式** — 从 ddEventListener 升级为 export default，Workers 最新标准
- **路径兼容修复** — 修复 CF Worker 合并 // 导致 URL 错误的问题
- **配置完全兼容** — Config.jsdelivr、whiteList、PREFIX 等配置不变

## 使用

直接在 copy 出来的 url 前加 https://你的worker域名/ 即可

也可以直接访问 Worker 首页，在输入框粘贴链接后点击"加速下载"

***大量使用请自行部署。***

访问私有仓库可以通过

git clone https://user:TOKEN@你的worker域名/https://github.com/xxxx/xxxx

## 部署

首页：https://workers.cloudflare.com

注册，登陆，Start building，取一个子域名，Create a Worker。

复制 [index.js](index.js) 全部代码到左侧代码框，Save and deploy。如果正常，右侧应显示新的现代化界面。

PREFIX 是前缀，默认（根路径情况为 "/"），如果自定义路由为 example.com/gh/*，请将 PREFIX 改为 '/gh/'，注意，少一个杠都会错！

## Cloudflare Workers计费

到 overview 页面可参看使用情况。免费版每天有 10 万次免费请求，并且有每分钟1000次请求的限制。

## Changelog

### 2026.07.27 优化版 v2 — 前端重构
- 全新现代化 UI，支持深色模式
- 前端页面内嵌 Worker，移除外部 ASSET_URL 依赖
- 卡片式示例，点击即可快速填入
- 一键复制加速链接

### 2026.07.27 优化版 v1
- 升级 ES Module 格式 (export default)
- 增加 CF Cache API 边缘缓存
- 支持 Range 请求头（断点续传）
- 增加 objects.githubusercontent.com 匹配
- 修复路径合并 bug

### 原版历史
- 2020.04.10 增加对 aw.githubusercontent.com 文件的支持
- 2020.04.09 增加 Python 版本（使用 Flask）
- 2020.03.23 新增了 clone 的支持
- 2020.03.22 初始版本

## 参考

[jsproxy](https://github.com/EtherDream/jsproxy/)