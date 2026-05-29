/**
 * Vercel Serverless Function：通过 Reddit OAuth2 API 抓取帖子标题和正文
 * 使用客户端凭证模式（client_credentials），仅需 client_id + client_secret
 */
let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Reddit API 未配置（缺少 REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET）');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const form = new URLSearchParams();
  form.append('grant_type', 'client_credentials');
  form.append('scope', 'read');

  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form.toString()
  });

  if (!response.ok) {
    throw new Error(`Reddit OAuth 失败 (HTTP ${response.status})`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

async function fetchPost(url, token) {
  const parsedUrl = new URL(url);
  const path = parsedUrl.pathname.replace(/\/?$/, '');

  const response = await fetch(`https://oauth.reddit.com${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'web:reddit-copy-generator:v1.0 (by /u/reddit-copy-gen)'
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Reddit API 请求失败 (HTTP ${response.status}): ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  const post = data?.[0]?.data?.children?.[0]?.data;
  if (!post) {
    throw new Error('未找到帖子内容');
  }

  return {
    title: post.title || '',
    body: post.selftext || ''
  };
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
    return res.status(400).json({ error: '缺少 url 参数', title: '', body: '' });
  }

  try {
    const token = await getAccessToken();
    const result = await fetchPost(url, token);

    if (!result.title && !result.body) {
      return res.status(404).json({ error: '帖子内容为空', title: '', body: '' });
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      error: `Reddit 抓取失败：${err.message}`,
      title: '',
      body: ''
    });
  }
}
