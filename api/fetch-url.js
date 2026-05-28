/**
 * Vercel Serverless Function：代理抓取网页内容
 * 绕过浏览器 CORS 限制，从服务端调用 Jina AI Reader 或直接抓取
 */

export default async function handler(req, res) {
  // 允许跨域
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

  // 辅助：原生抓取 fallback（去掉 HTML 标签）
  async function rawFetch(targetUrl) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(targetUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: controller.signal
      });
      clearTimeout(timer);
      const html = await response.text();
      // 简单去标签 + 压缩空白
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return text.slice(0, 3000);
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }

  try {
    // 第一优先：Jina AI Reader（返回干净 Markdown）
    const jinaUrl = `https://r.jina.ai/${url}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    const jinaResponse = await fetch(jinaUrl, {
      headers: { 'Accept': 'text/plain' },
      signal: controller.signal
    });
    clearTimeout(timer);

    if (jinaResponse.ok) {
      const text = await jinaResponse.text();
      return res.status(200).json({
        content: text.slice(0, 3000),
        source: 'jina'
      });
    }
  } catch (e) {
    // Jina 失败，继续 fallback
  }

  // 第二优先：原生抓取
  try {
    const text = await rawFetch(url);
    return res.status(200).json({
      content: text,
      source: 'raw'
    });
  } catch (e) {
    return res.status(500).json({
      error: `抓取失败：${e.message || '未知错误'}`,
      content: ''
    });
  }
}
