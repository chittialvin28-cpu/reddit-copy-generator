# Reddit 爆款文案生成器 — 产品需求文档

## Problem Statement

用户在 Reddit 上发现竞品的爆款帖子，希望通过 AI 分析爆款原因，并生成适合自己产品的 Reddit 运营文案。当前方案存在三个痛点：

1. **API Key 暴露风险**：DeepSeek API Key 存储在浏览器 localStorage，任何前端使用者都能通过控制台窃取。
2. **Reddit 内容抓取不可靠**：Reddit 对浏览器端请求实施严格封锁，第三方 CORS 代理不稳定，无法依赖。
3. **流程碎片化**：官网抓取（`/api/fetch-url`）和 AI 调用（前端直连 DeepSeek）分属两端，增加了出错的面。

## Solution

将 AI 调用也后端化，统一到一个 Serverless Function（`/api/generate`）中处理。前端只负责输入收集和流式展示，不再接触任何 API Key。这是最小侵入的改造方案，在 Vercel Hobby（免费）计划的时间预算内完成。

Reddit 抓取作为锦上添花的功能 — 后端会在调用 AI 的同时尝试 `fetch(redditUrl + '.json')`，成功则自动填充标题和正文，失败则使用用户已手动输入的内容。不阻塞流程。

## User Stories

1. 作为一个付费产品用户，我想在前端页面填写 Reddit 帖子链接和正文、竞品产品信息、我的产品信息，以便 AI 分析爆款文案。
2. 作为一个付费产品用户，我想输入竞品官网和我的官网链接并一键抓取，以便 AI 获取更多产品上下文。
3. 作为一个付费产品用户，我想点击「生成文案」后看到流式输出效果，以便实时感知 AI 的生成进度。
4. 作为一个付费产品用户，我想一键复制生成的文案，以便发布到 Reddit。
5. 作为产品所有者，我想把 DeepSeek API Key 安全地放在 Vercel 环境变量中，以便用户无法从浏览器控制台窃取。
6. 作为产品所有者，我希望后端在 SSRF 风险可控的前提下尝试抓取 Reddit JSON，以便提升用户体验（失败不影响正常使用）。
7. 作为产品所有者，我希望产品部署在 Vercel 免费计划上，以便零成本启动。

## Implementation Decisions

### 架构总览

```
前端（index.html）
  ├── 调 /api/fetch-url（官网抓取）— 已实现，不动
  └── 调 /api/generate（AI 生成）— 新增
        ├── 后端尝试 Reddit .json 抓取（锦上添花）
        ├── 后端构建 Prompt（buildPrompt 逻辑从前端移到后端）
        ├── 后端调用 DeepSeek（stream=true）
        └── 后端 SSE 转发 AI 流式输出给前端
```

### 核心决策

| 决策 | 选择 | 原因 |
|---|---|---|
| AI 调用方式 | 后端 SSE 流式透传 | Vercel Hobby 10s 超时限制；非 stream 模式容易超时 |
| API Key 存放 | Vercel 环境变量（`DEEPSEEK_API_KEY`） | 前端零接触，防止防盗刷 |
| Reddit 抓取 | 后端尝试 `.json` fetch，失败跳过 | 服务端可避开 Origin 限制，但成功率不保证 |
| 官网抓取 | 保留 `/api/fetch-url` 不动 | 已实现的逻辑稳定，解耦 |
| 模型选择 | 暂时仅 DeepSeek，移除 Kimi 选项 | Kimi 未接入，保留无效选项会误导用户 |

### `/api/generate` API 合约

**请求**（POST）：

```json
{
  "model": "deepseek-v4",
  "redditUrl": "https://www.reddit.com/r/.../comments/.../...",
  "redditBody": "帖子正文文本",
  "competitorInfo": "竞品产品信息",
  "myInfo": "我的产品信息"
}
```

**响应**（SSE 流）：

```
event: token
data: {"token": "分析"}

event: token
data: {"token": "结果"}

event: done
data: {}

event: error
data: {"error": "错误信息"}
```

### 前端改动

- 删除 `callDeepSeek()`、`buildPrompt()` 函数（移入后端）
- 新增 SSE 流式接收逻辑（`EventSource` 不可用，用 `fetch` + `ReadableStream` 手动解析）
- 新增 loading 动画（代替当前简单的"正在调用"文字）
- 删除 `localStorage.getItem('deepseek_api_key')` 相关代码
- 保持 `fetchWebsiteContent()`、`handleFetchWebsite()` 不变

### 部署方式

- Vercel 导入项目根目录，自动识别 `api/` 目录为 Serverless Functions
- 在 Vercel Dashboard 中设置 `DEEPSEEK_API_KEY` 环境变量
- 根目录 `vercel.json`（如需覆写默认配置）

## Testing Decisions

- 部署到 Vercel 后手动测试完整流程：填信息 → 官网抓取 → 生成文案 → 流式展示 → 复制
- 分别测试 Reddit 链接有 `.json` 和没有 `.json` 两种情况
- 验证开发者工具 Network 标签中无 API Key 泄露

## Out of Scope

- 用户注册 / 登录 / 付费墙 — 现阶段不做
- 其他 AI 模型接入（Kimi 等）— 待后续决策
- Reddit 帖子自动抓取的稳定性保障 — 作为锦上添花功能，不承诺 100% 成功率
- 数据库存储用户历史文案
- 移动端深度适配（当前媒体查询已够用）
- 产品三级域名或自定义域名配置

## Further Notes

- 项目遵循「最小侵入」原则：每次只动最小范围的代码，不重构正常运行的部分
- 所有 async 操作必须有 try/catch
- 界面文字保持中文
- 当前项目未初始化 Git 仓库，部署 Vercel 前需先 `git init`
