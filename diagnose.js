// 诊断脚本：测试不同代理获取 Reddit JSON 的能力
const testUrl = 'https://www.reddit.com/r/passive_income/comments/1tioyc7/going_to_hit_7figures_in_revenue_in_ecommerce.json';

const proxies = [
  { name: 'allorigins', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(testUrl)}` },
  { name: 'corsproxy.io', url: `https://corsproxy.io/?${encodeURIComponent(testUrl)}` },
  { name: 'codetabs', url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(testUrl)}` },
];

async function testProxy(proxy) {
  try {
    console.log(`\n[TEST] ${proxy.name}: ${proxy.url}`);
    const res = await fetch(proxy.url, { headers: { 'User-Agent': 'RedditCopywriter/1.0' } });
    console.log(`  Status: ${res.status}`);
    const text = await res.text();
    console.log(`  Body preview: ${text.slice(0, 200)}`);
    try {
      const json = JSON.parse(text);
      if (Array.isArray(json) && json[0]?.data?.children?.[0]?.data?.title) {
        console.log(`  ✅ SUCCESS: title = "${json[0].data.children[0].data.title.slice(0, 50)}"`);
        return true;
      } else if (json.error) {
        console.log(`  ❌ PROXY ERROR: ${json.error}`);
      } else {
        console.log(`  ❌ UNEXPECTED JSON STRUCTURE`);
      }
    } catch {
      console.log(`  ❌ NOT VALID JSON`);
    }
  } catch (e) {
    console.log(`  ❌ FETCH ERROR: ${e.message}`);
  }
  return false;
}

async function main() {
  console.log('=== Reddit Fetch Diagnosis ===');
  console.log('Target:', testUrl);
  
  for (const proxy of proxies) {
    await testProxy(proxy);
  }
  
  console.log('\n=== Done ===');
}

main();
