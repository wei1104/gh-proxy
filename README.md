# GH Proxy

GitHub Release、Archive、文件下载加速代理，基于 Cloudflare Workers。

## 功能特性

### 前端
- 支持 Release、Archive、Blob、Raw 文件加速下载
- 现代化暗黑主题 UI，支持暗色/亮色主题切换
- 点击下载自动触发浏览器下载，同时显示可复制的加速链接
- 链接类型自动识别（Release / Archive / Blob / Raw）
- 连接延迟实时检测
- **DNS 预解析**：提前解析 GitHub/jsDelivr 域名，加速首次访问
- 响应式设计，完美适配移动端
- 背景粒子动画 + 渐变光晕特效

### 后端优化
- **Cache API 边缘缓存**：Release 1天、Raw 1小时、静态资源 7天
- **stale-while-revalidate**：缓存过期后先返回旧内容，后台刷新
- **请求合并（Dedupe）**：同一 URL 并发请求只回源一次
- **条件请求**：自动传递 ETag / If-Modified-Since，304 直接用缓存
- **失败重试**：429/502/503/504 自动重试 2 次，指数退避
- **请求限流**：60 次/分钟/IP，防止滥用
- **Range 请求支持**：支持断点续传，下载器可从断点继续
- **流式响应**：边收边传，降低首字节时间（TTFB）
- **可配置超时**：默认 30 秒，避免长时间挂起
- **镜像回退**：GitHub 失败自动切换 jsDelivr CDN
- **自定义错误页**：友好的错误页面替代纯文本
- **Timing 响应头**：server-timing 返回请求耗时，便于调试
- **请求头优化**：移除不必要的 hop-by-hop 头
- **TextEncoder 编码**：确保中文正确显示

## 使用方法

在 GitHub 文件链接前加上你的 Worker 地址即可：

```
https://your-worker.dev/https://github.com/user/repo/releases/download/v1.0/file.zip
```

或者直接访问 Worker 地址，在输入框中粘贴 GitHub 链接，点击下载。

### 支持的链接类型

| 类型 | 示例 |
|------|------|
| 分支源码 | `https://github.com/user/repo/archive/master.zip` |
| Release 源码 | `https://github.com/user/repo/archive/v1.0.tar.gz` |
| Release 文件 | `https://github.com/user/repo/releases/download/v1.0/file.zip` |
| 分支文件 | `https://github.com/user/repo/blob/master/file.js` |
| Raw 文件 | `https://raw.githubusercontent.com/user/repo/master/file.js` |
| Gist 文件 | `https://gist.githubusercontent.com/user/id/raw/file.py` |

### 私有仓库访问

```
git clone https://user:TOKEN@your-worker.dev/https://github.com/user/repo.git
```

## 部署方法

### 1. 创建 Worker

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 Workers & Pages
3. 点击 Create Worker
4. 将 `index.js` 的内容粘贴到编辑器中
5. 保存并部署

### 2. 自定义域名（可选）

在 Worker 设置 → Triggers → Custom Domains 中添加你的域名。

## 配置说明

在 `index.js` 顶部修改配置：

```javascript
const Config = {
    jsdelivr: 0,                    // 使用 jsDelivr 镜像：0=关闭, 1=开启（硬切换）
    cache: {
        release: 86400,            // Release/Archive 缓存时间（秒），默认 1 天
        raw: 3600,                 // Raw 文件缓存时间（秒），默认 1 小时
        static: 604800             // 静态资源缓存时间（秒），默认 7 天
    },
    retry: {
        count: 2,                  // 失败重试次数
        delay: 500                 // 基础重试延迟（毫秒），实际按 2^n 递增
    },
    rateLimit: {
        max: 60,                   // 单 IP 最大请求数
        window: 60000              // 限流窗口（毫秒），默认 1 分钟
    },
    timeout: 30000,                // 请求超时时间（毫秒），默认 30 秒
    fallback: true                 // GitHub 失败时自动回退到 jsDelivr 镜像
}
```

### 配置示例

**提高缓存时间**（适合访问量大的仓库）：
```javascript
cache: { release: 604800, raw: 86400, static: 2592000 }
```

**关闭限流**：
```javascript
rateLimit: { max: Infinity, window: 60000 }
```

**更多重试**：
```javascript
retry: { count: 3, delay: 1000 }
```

**关闭镜像回退**（只用 GitHub）：
```javascript
fallback: false
```

**自定义超时**（慢速网络可调大）：
```javascript
timeout: 60000
```

## 缓存机制

```
客户端请求
    ↓
Cache API 命中? ──是──→ 返回缓存（CF-HIT）
    ↓ 否
发送到 GitHub（带条件请求头 + Range 头）
    ↓
304 Not Modified? ──是──→ 用缓存响应
    ↓ 否
GitHub 失败? ──是──→ 回退到 jsDelivr 镜像
    ↓ 否
正常响应 → 写入 Cache API → 返回客户端
```

- **stale-while-revalidate**：缓存过期 5 分钟内仍返回旧内容，后台异步刷新
- **请求合并**：同一时间对同一 URL 的多个请求，只回源一次
- **失败重试**：遇到限流或服务器错误自动重试，指数退避
- **镜像回退**：GitHub 5xx 或超时时自动切换 jsDelivr

## 网络优化说明

| 功能 | 说明 |
|------|------|
| **Range 请求** | 支持 `Range: bytes=0-1023`，返回 `206 Partial Content`，下载器可断点续传 |
| **流式响应** | Worker 不缓冲整个响应体，边从 GitHub 接收边传给客户端 |
| **超时控制** | 默认 30 秒超时，超时后自动重试或回退到镜像 |
| **DNS 预解析** | HTML 中预解析 `github.com`、`raw.githubusercontent.com`、`cdn.jsdelivr.net` |

## 响应头说明

| Header | 说明 |
|--------|------|
| `x-cache-status` | `CF-HIT` 表示命中边缘缓存 |
| `server-timing` | `total;dur=xx` 请求总耗时（毫秒） |
| `accept-ranges` | `bytes` 表示支持 Range 请求 |

## 致谢

- [hunshcn/gh-proxy](https://github.com/hunshcn/gh-proxy) - 原始项目
- [Cloudflare Workers](https://workers.cloudflare.com) - 无服务器平台

## License

MIT
