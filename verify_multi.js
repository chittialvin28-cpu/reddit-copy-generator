const urls = [
  'https://www.reddit.com/r/entrepreneur/comments/1tj8251/ran_ai_video_ads_for_my_dads_business_we_blew_up/.json',
  'https://www.reddit.com/r/passive_income/comments/1tioyc7/going_to_hit_7figures_in_revenue_in_ecommerce.json',
  'https://www.reddit.com/r/startups/comments/1tjd8yl/i_built_a_saas_that_makes_10k_mrr/.json',
];

async function test(url) {
  const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
  try {
    const res = await fetch(proxyUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      if (Array.isArray(json) && json[0]?.data?.children?.[0]?.data?.title) {
        console.log(`✅ ${url.slice(0, 60)}... -> ${json[0].data.children[0].data.title.slice(0, 50)}`);
        return true;
      }
    } catch {}
    console.log(`❌ ${url.slice(0, 60)}... -> status=${res.status}, not JSON`);
  } catch (e) {
    console.log(`❌ ${url.slice(0, 60)}... -> ${e.message}`);
  }
  return false;
}

(async () => {
  for (const url of urls) await test(url);
})();
