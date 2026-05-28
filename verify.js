const testUrl = 'https://www.reddit.com/r/passive_income/comments/1tioyc7/going_to_hit_7figures_in_revenue_in_ecommerce.json';
const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(testUrl)}`;

async function verify() {
  try {
    const res = await fetch(proxyUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    console.log('Status:', res.status);
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      if (Array.isArray(json) && json[0]?.data?.children?.[0]?.data?.title) {
        const d = json[0].data.children[0].data;
        console.log('✅ SUCCESS');
        console.log('Title:', d.title);
        console.log('Subreddit:', d.subreddit);
        console.log('Score:', d.score);
        console.log('Selftext:', d.selftext ? d.selftext.slice(0, 100) + '...' : '(empty)');
      } else {
        console.log('❌ Unexpected JSON structure');
        console.log(text.slice(0, 200));
      }
    } catch {
      console.log('❌ Not JSON:', text.slice(0, 200));
    }
  } catch (e) {
    console.log('❌ Fetch error:', e.message);
  }
}

verify();
