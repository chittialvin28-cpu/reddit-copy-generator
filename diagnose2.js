const testUrl = 'https://www.reddit.com/r/passive_income/comments/1tioyc7/going_to_hit_7figures_in_revenue_in_ecommerce.json';

const proxies = [
  { name: 'allorigins-get', url: `https://api.allorigins.win/get?url=${encodeURIComponent(testUrl)}` },
  { name: 'allorigins-raw', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(testUrl)}` },
  { name: 'corsproxy.org', url: `https://corsproxy.org/?${encodeURIComponent(testUrl)}` },
  { name: 'cors.deno.dev', url: `https://cors.deno.dev/${encodeURIComponent(testUrl)}` },
  { name: 'cors-anywhere', url: `https://cors-anywhere.herokuapp.com/${testUrl}` },
  { name: 'thingproxy', url: `https://thingproxy.freeboard.io/fetch/${testUrl}` },
];

async function testProxy(proxy) {
  try {
    console.log(`\n[TEST] ${proxy.name}`);
    const res = await fetch(proxy.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    console.log(`  Status: ${res.status}`);
    const text = await res.text();
    console.log(`  Body preview: ${text.slice(0, 150).replace(/\n/g, ' ')}`);
    try {
      const json = JSON.parse(text);
      if (Array.isArray(json) && json[0]?.data?.children?.[0]?.data?.title) {
        console.log(`  ✅ SUCCESS`);
        return true;
      }
      console.log(`  ❌ JSON but no expected structure`);
    } catch {
      console.log(`  ❌ NOT JSON`);
    }
  } catch (e) {
    console.log(`  ❌ ERROR: ${e.message}`);
  }
  return false;
}

async function main() {
  console.log('=== Extended Reddit Proxy Diagnosis ===');
  for (const proxy of proxies) {
    await testProxy(proxy);
  }
  console.log('\n=== Done ===');
}

main();
