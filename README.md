# GH Proxy

GitHub Release、Archive、文件下载加速代理，基于 Cloudflare Workers。

## 功能特性

- 支持 Release、Archive、Blob、Raw 文件加速下载
- 现代化暗黑主题 UI，支持暗色/亮色主题切换
- 一键下载，点击即调用下载器
- 链接类型自动识别（Release / Archive / Blob / Raw）
- 连接延迟实时检测
- Cache API + KV 双层缓存加速
- 响应式设计，完美适配移动端

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

### 2. 配置 KV 缓存（可选）

1. 在 Cloudflare Dashboard 中创建 KV Namespace
2. 进入 Worker 设置 → Bindings
3. 添加 KV Namespace Binding：
   - Variable name: `KV`
   - KV namespace: 选择刚创建的 Namespace
4. 重新部署

### 3. 自定义域名（可选）

在 Worker 设置 → Triggers → Custom Domains 中添加你的域名。

## 配置说明

在 `index.js` 顶部修改配置：

```javascript
const Config = {
    jsdelivr: 0,           // 使用 jsDelivr 镜像：0=关闭, 1=开启
    cache: {
        release: 86400,    // Release 文件缓存时间（秒）
        raw: 3600,         // Raw 文件缓存时间（秒）
        static: 604800,    // 静态资源缓存时间（秒）
    },
    kv: {
        enabled: true,     // 是否启用 KV 缓存
        releaseTTL: 604800, // KV 中 Release 文件过期时间（秒）
        rawTTL: 86400,      // KV 中 Raw 文件过期时间（秒）
    }
}
```

## 性能优化

本项目包含以下性能优化：

- **Cache API 缓存**：Cloudflare 边缘节点缓存，减少源站请求
- **KV 持久化缓存**：跨边缘节点共享缓存，适合大文件
- **请求头优化**：移除不必要的 hop-by-hop 头
- **TextEncoder 编码**：确保中文正确显示

## 致谢

- [hunshcn/gh-proxy](https://github.com/hunshcn/gh-proxy) - 原始项目
- [Cloudflare Workers](https://workers.cloudflare.com) - 无服务器平台

## License

MIT
