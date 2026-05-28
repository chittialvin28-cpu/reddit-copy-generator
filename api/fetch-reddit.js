/**
 * Vercel Serverless Function：抓取 Reddit 帖子标题和正文
 * 通过 .json 后缀从服务端获取，绕过浏览器限制
 * 备选策略：www 失败 → old.reddit.com → 纯文本 fallback
 */
async function tryFetchReddit(jsonUrl) {
  const response = await fetch(jsonUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*'
    }
  });
  if (!response.ok) return null;
  const data = await response.json();
  const post = data?.[0]?.data?.children?.[0]?.data;
  if (!post) return null;
  return { title: post.title || '', body: post.selftext || '' };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: '缺少 url 参数' });
  }

  try {
    // 策略 1: 原始 URL + .json
    const jsonUrl = url + '.json';
    let result = await tryFetchReddit(jsonUrl);

    // 策略 2: old.reddit.com
    if (!result && url.includes('www.reddit.com')) {
      const oldUrl = url.replace('www.reddit.com', 'old.reddit.com') + '.json';
      result = await tryFetchReddit(oldUrl);
    }

    // 策略 3: old.reddit.com + raw_json=1
    if (!result && url.includes('www.reddit.com')) {
      const oldUrl = url.replace('www.reddit.com', 'old.reddit.com') + '.json?raw_json=1';
      result = await tryFetchReddit(oldUrl);
    }

    // 策略 4: Jina AI Reader（有独立 IP，通常不会被封）
    if (!result) {
      try {
        const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
          headers: { 'Accept': 'text/plain' }
        });
        if (jinaRes.ok) {
          const text = await jinaRes.text();
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          const title = lines.find(l => l.startsWith('Title:'))?.replace(/^Title:\s*/i, '') || '';
          const bodyStart = text.indexOf('\n\n');
          const body = bodyStart > 0 ? text.slice(bodyStart).trim().slice(0, 3000) : text.slice(0, 3000);
          result = { title, body };
        }
      } catch (_) {}
    }

    if (!result) {
      return res.status(404).json({
        error: 'Reddit 帖子抓取失败，请手动填写正文（Vercel 服务器 IP 可能被 Reddit 限制）',
        title: '',
        body: ''
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      error: `Reddit 抓取失败：${err.message || '未知错误'}`,
      title: '',
      body: ''
    });
  }
}
