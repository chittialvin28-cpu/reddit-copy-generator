/**
 * Vercel Serverless Function：AI 文案生成
 * 接收前端输入 → 构建 Prompt → 调 DeepSeek（stream）→ SSE 转发
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' });
  }

  const { model, redditUrl, redditBody, competitorInfo, myInfo } = req.body || {};

  if (!redditUrl || !redditBody) {
    return res.status(400).json({ error: '缺少必填参数：redditUrl, redditBody' });
  }

  if (!competitorInfo || !myInfo) {
    return res.status(400).json({ error: '请填写竞品产品信息和我的产品信息' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '服务端 API Key 未配置' });
  }

  // 模型名映射
  const modelMap = {
    'deepseek-v4': 'deepseek-chat'
  };
  const actualModel = modelMap[model] || 'deepseek-chat';

  const prompt = buildPrompt(redditUrl, redditBody, competitorInfo, myInfo);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: actualModel,
        messages: [{ role: 'user', content: prompt }],
        stream: true
      })
    });

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error?.message || errorMsg;
      } catch (_) {}
      throw new Error(errorMsg);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;

        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              res.write(`event: token\ndata: ${JSON.stringify({ token: delta })}\n\n`);
            }
          } catch (_) {}
        }
      }
    }

    // 处理 buffer 剩余内容
    if (buffer.trim() && buffer.trim() !== 'data: [DONE]' && buffer.trim().startsWith('data: ')) {
      try {
        const json = JSON.parse(buffer.trim().slice(6));
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          res.write(`event: token\ndata: ${JSON.stringify({ token: delta })}\n\n`);
        }
      } catch (_) {}
    }

    res.write(`event: done\ndata: {}\n\n`);
    res.end();
  } catch (err) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}

function buildPrompt(redditUrl, redditBody, competitorInfo, myInfo) {
  const match = redditUrl.match(/\/r\/([^/]+)\/comments\/[^/]+\/([^/]+)/);
  const subreddit = match ? 'r/' + match[1] : '';
  const title = match ? match[2].replace(/_/g, ' ') : '';

  return `你是一名精通 Reddit 社区运营的内容策略师。

## 任务说明
用户提供了竞品在 Reddit 上的一篇爆款帖子，以及自己的产品信息。
你需要分析爆款原因，完成产品映射，最终生成用户自己产品的 Reddit 帖子。

核心原则：新帖子的营销感和推广力度，必须严格低于竞品这篇爆款帖子。
竞品帖子能在这个社区存活并获得高赞，说明它的营销尺度是该社区的上限。
我们的帖子只能比它更克制，不能更明显。

---

## 输入信息

### 爆款帖子
- 来源链接（含 subreddit 信息）: ${redditUrl}
- 标题: ${title || '未提供'}
- 正文: ${redditBody || '未提供'}

### 竞品产品信息
${competitorInfo || '未提供'}

### 我的产品信息
${myInfo || '未提供'}

---

## 输出要求

### 第一部分：爆款结构分析
简洁分析以下五项，每项一两句话即可：
- 标题公式
- 钩子类型
- 叙事结构
- 语气风格
- CTA 方式
- 营销感评估：这篇帖子的营销力度如何隐藏？用了什么手法让推广显得自然？

### 第二部分：产品映射表

⚠️ 在开始映射之前，先判断：我的产品信息是否足够完成映射？
判断标准：是否知道产品解决什么问题、目标用户是谁、核心功能是什么。

如果信息不足：
停止输出，直接告诉用户：
「当前产品信息不足以完成映射，请补充以下内容：
1. 你的产品解决什么核心问题？
2. 主要目标用户是谁？
3. 最核心的 1~2 个功能是什么？
4. 和竞品最大的区别是什么？」

如果信息充足，输出以下表格：

| 维度 | 竞品帖子的处理方式 | 我的产品可以如何对应 |
|---|---|---|
| 核心问题 | （竞品帖子触达了什么用户痛点）| （我的产品对应的痛点）|
| 目标用户描述 | （帖子里描述的是什么样的人）| （我的产品的对应用户）|
| 产品出现方式 | （竞品产品是如何、在哪里被提及的）| （我的产品应该如何出现）|
| 情感触点 | （帖子触发了什么情绪）| （我的产品可以触发的对应情绪）|
| 营销隐藏手法 | （竞品用了什么方式让推广显得自然）| （我应该用同样或更克制的方式）|

### 第三部分：新帖子

基于以上分析，生成帖子。

硬性约束：
- 标题备选：3 个，每个使用不同公式
- 正文：与竞品帖子保持接近
- 产品名称出现次数：不超过竞品帖子中产品名称的出现次数
- 营销感：只能比竞品帖子更低，不能更高
- 语气：与竞品帖子保持一致
- 语言完全重写，不出现与原帖相同的句式`;
}
