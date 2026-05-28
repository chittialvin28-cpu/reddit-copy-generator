# P0: Vercel 部署计划 — 官网链接抓取

## 概述

将项目初始化 Git 并部署到 Vercel，使 `/api/fetch-url` 接口可用，实现通过官网链接抓取产品内容的功能。

## 当前状态

- 项目尚未初始化 Git 仓库（无 `.git`）
- 无 `.gitignore`、无 `vercel.json`、无 `package.json`
- `/api/fetch-url.js` 已写好，内容正确：先调 Jina AI Reader，失败则原生抓取，返回纯文本前 3000 字符
- 前端 `index.html` 中的 `fetchWebsiteContent()` 和 `handleFetchWebsite()` 已就绪，通过 `/api/fetch-url?url=...` 调用后端
- 部署方式：Vercel CLI（`npx vercel`）

## 涉及的文件

| 文件 | 操作 | 说明 |
|---|---|---|
| `.gitignore` | **新建** | 忽略 `node_modules/`、`.vercel/`、`.env` |
| （无其他文件改动） | | 前端和后端代码零改动 |

## 实施步骤

### Step 1: 创建 `.gitignore`

```gitignore
node_modules
.vercel
.env
```

### Step 2: 初始化 Git 仓库

```bash
cd /Users/Zhuanz/reddit爆款
git init
```

### Step 3: 通过 Vercel CLI 部署

```bash
npx vercel
```

CLI 会引导：
1. 打开浏览器登录 Vercel（新用户需注册账号，支持 GitHub/Google/Email）
2. 是否链接已有项目 → 选 No（新建）
3. 项目名称 → 默认或自定义（如 `reddit-copy-generator`）
4. 框架 → 自动检测或不检测（选 Other）
5. 部署 → 确认后部署

部署完成后会输出一个 `.vercel` 目录和 Preview URL（如 `https://reddit-copy-generator.vercel.app`）。

### Step 4: 验证 `/api/fetch-url`

在浏览器中访问：

```
https://<你的域名>.vercel.app/api/fetch-url?url=https://www.apple.com
```

预期返回：
```json
{
  "content": "...（Apple 官网前 3000 字符）...",
  "source": "jina"
}
```

### Step 5: 本地测试

启动本地静态服务器并打开 `index.html`：

```bash
npx serve .
```

然后在前端页面：
1. 在「竞品官网链接」输入框填入一个官网 URL（如 `https://www.apple.com`）
2. 点击「从竞品官网抓取」
3. 观察「竞品产品信息」文本区是否填充了抓取内容

## 测试用链接

部署完成后，你可以用以下链接在前端验证官网抓取：

| 测试 | 链接 | 预期 |
|---|---|---|
| 竞品官网 | `https://www.apple.com` 或 `https://www.notion.so` | 内容区填充抓取到的文本 |
| 我的官网 | `https://github.com/about` 或 `https://openai.com` | 内容区填充抓取到的文本 |

## 验证标准

1. ✅ 访问 `https://<域名>/api/fetch-url?url=https://example.com` 返回 JSON（含 `content` 字段）
2. ✅ 前端页面点击「从竞品官网抓取」按钮后，「竞品产品信息」文本区填入抓取内容
3. ✅ 前端页面点击「从我的官网抓取」按钮后，「我的产品信息」文本区填入抓取内容
4. ✅ 浏览器控制台 Network 标签查看请求无 403/500 错误
