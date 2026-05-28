const testUrl = 'https://www.reddit.com/r/passive_income/comments/1tioyc7/going_to_hit_7figures_in_revenue_in_ecommerce.json';

const proxies = [
  { name: 'allorigins2', url: `https://api.allorigins.win/get?url=${encodeURIComponent(testUrl)}&random=${Math.random()}` },
  { name: 'corsproxy-web', url: `https://corsproxy.web.app/cors?url=${encodeURIComponent(testUrl)}` },
  { name: 'cors-sh', url: `https://cors.sh/${testUrl}` },
  { name: 'corsproxy-mesh', url: `https://corsproxy.meshy.ai/?${encodeURIComponent(testUrl)}` },
  { name: 'codetabs2', url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(testUrl)}` },
];

async function testProxy(proxy) {
  try {
    console.log(`\n[TEST] ${proxy.name}`);
    const res = await fetch(proxy.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    console.log(`  Status: ${res.status}`);
    const text = await res.text();
    console.log(`  Preview: ${text.slice(0, 120).replace(/\n/g, ' ')}`);
    try {
      const json = JSON.parse(text);
      if (Array.isArray(json) && json[0]?.data?.children?.[0]?.data?.title) {
        console.log(`  ✅ SUCCESS: ${json[0].data.children[0].data.title.slice(0, 40)}`);
        return true;
      }
    } catch {}
  } catch (e) {
    console.log(`  ❌ ${e.message}`);
  }
  return false;
}

async function main() {
  for (const p of proxies) await testProxy(p);
}
main();
