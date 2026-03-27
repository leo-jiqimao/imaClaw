module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const topics = [
    { id: '1', title: '早秋穿搭', platform: 'xiaohongshu', heat: 98, category: '时尚', trending: true },
    { id: '2', title: '减脂餐', platform: 'douyin', heat: 95, category: '美食', trending: true },
    { id: '3', title: '职场干货', platform: 'wechat', heat: 88, category: '职场', trending: false },
    { id: '4', title: '旅行攻略', platform: 'xiaohongshu', heat: 92, category: '旅行', trending: true },
    { id: '5', title: '智能家居', platform: 'douyin', heat: 85, category: '科技', trending: false },
  ];

  return res.json(topics);
};
