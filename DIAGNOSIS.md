# Reddit 爆款文案生成器 — 读取功能诊断报告

## 功能需求
在单文件 HTML 网页中实现「读取」按钮：用户输入 Reddit 帖子链接，前端通过 fetch 抓取帖子 JSON 数据，提取标题、正文、subreddit、upvote 数并展示在页面上。

技术约束：
- 单文件 HTML（HTML + CSS + JS 不分离）
- 不引入 npm 包或构建工具
- API Key 由用户在前端输入，不走后端
- Reddit 数据通过在 URL 末尾加 `.json` 直接 fetch

## 核心问题
**浏览器中无法通过前端 JavaScript 稳定、可靠地获取 Reddit 帖子 JSON 数据。**

根本原因：**Reddit 对未认证/浏览器端 JSON API 访问做了严格限制，且免费 CORS 代理存在严重的 rate limiting 和不稳定性。**

## 排查步骤与结果

### Step 1：直接 fetch Reddit JSON
**尝试**：在输入 URL 末尾加 `.json`，用 `fetch()` 直接请求。
**结果**：❌ 失败。浏览器从 `file://` 协议发送 `Origin: null`，Reddit 返回 CORS 错误 + 403。
**验证**：用 curl 确认 Reddit JSON 端点本身有 `access-control-allow-origin: *`，但仅在**不带 Origin 头**时生效；浏览器 fetch 自动发送 Origin 头，必然触发 403。

### Step 2：使用 corsproxy.io 代理
**尝试**：通过 `https://corsproxy.io/?URL` 转发请求。
**结果**：❌ 失败。`corsproxy.io` 返回 403，错误信息：
> "Free usage is limited to localhost and development. Get an API key at https://corsproxy.io/pricing/"
**结论**：`file://` 协议下 Origin 为 `null`，不在 corsproxy.io 的免费白名单内。

### Step 3：尝试本地服务器绕过限制
**尝试**：启动 `python3 -m http.server 8080`，通过 `http://localhost:8080` 访问。
**结果**：❌ 失败。后台任务因超时而终止，用户本地无法稳定维持服务器进程。
**补充**：即使 localhost 能访问，后续测试表明 Reddit 对**任何**带 Origin 头的请求都返回 403，直接 fetch 依然不可行。

### Step 4：使用 api.allorigins.win 代理
**尝试**：通过 `https://api.allorigins.win/raw?url=URL` 转发。
**结果**：❌ 失败。allorigins 返回 522（Cloudflare 连接超时）或 500，Reddit 已封锁该代理 IP。

### Step 5：使用 api.codetabs.com 代理
**尝试**：通过 `https://api.codetabs.com/v1/proxy?quest=URL` 转发。
**服务器端测试**：✅ 对某些 Reddit 帖子（如 r/passive_income）能成功返回 JSON 数据，且响应头带 `access-control-allow-origin: *`。
**浏览器端测试**：⚠️ 间歇性成功。初次测试对 r/passive_income 帖子能成功抓取并展示，但换链接后再次失败。

### Step 6：用户实测 — 关键发现
**测试条件**：在 `file://` 协议下打开页面，使用 codetabs + corsproxy.io fallback 代理。

| 测试场景 | 结果 |
|---------|------|
| 普通 Reddit 链接（无 `.json`）| ❌ 读取失败 |
| 手动在链接末尾加 `.json` | ✅ **读取成功**（r/passive_income 帖子） |
| 换另一个链接，手动加 `.json` | ❌ **再次失败** |
| 等待一段时间后重试 | 结果不稳定，时而成功时而失败 |

**核心发现**：
1. **代理并非完全不可用** — 手动加 `.json` 后，某些帖子在特定时刻可以成功获取
2. **存在严格的 rate limiting** — 短时间多次访问后，无论是否加 `.json`，都会失败
3. **成功率极低且不可预测** — 无法作为产品功能依赖

### Step 7：多代理 fallback + JSON 结构校验
**尝试**：依次尝试 codetabs → corsproxy.io，并校验返回数据是否为 Reddit JSON 结构。
**结果**：❌ 无法解决根本问题。Rate limiting 导致两个代理轮流失败，fallback 机制形同虚设。

## 失败结论
**在当前技术约束下（纯前端、无后端、单文件 HTML），无法稳定、可靠地从浏览器端抓取 Reddit 帖子 JSON 数据。**

Reddit 自 2023 年起对未认证 API 访问实施了多重限制：
- **CORS 策略**：阻止浏览器直接跨域请求
- **Bot Detection + Rate Limiting**：所有公开免费 CORS 代理均被 Reddit 封锁或自身限制
- **间歇性可用**：极少数情况下代理能穿透，但成功率低且不可预测，无法作为产品功能

## 可能的替代方向（需用户决策）
1. **用户手动粘贴 JSON**：在页面上提供 textarea，让用户自行从 Reddit `.json` 端点复制内容粘贴 —— 唯一目前验证可行的方案
2. **引入后端代理**：部署一个简单的后端服务（如 Vercel Edge Function / Cloudflare Worker）来代理 Reddit 请求，但这违反了"单文件静态托管"的约束
3. **使用 Reddit 官方 API**：需要 OAuth 认证，有封号风险，用户已明确表示不愿使用
4. **使用第三方 Reddit 数据服务**：如 Pushshift API，但服务稳定性不保证
