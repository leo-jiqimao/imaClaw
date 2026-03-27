const axios = require('axios');

// 今日热榜 API - 免费获取各平台热点
const TOPHUB_API = 'https://www.tophub.app:8888';

// 平台ID映射
const PLATFORM_MAP = {
  'weibo': { name: '微博', id: '1' },
  'zhihu': { name: '知乎', id: '2' },
  'douyin': { name: '抖音', id: '3' },
  'xiaohongshu': { name: '小红书', id: '4' },
  'bilibili': { name: 'B站', id: '5' },
  'wechat': { name: '微信', id: '6' },
};

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

  try {
    // 获取微博热搜
    const weiboResponse = await axios.get(`${TOPHUB_API}/v2/GetAllInfoGzip?id=1&page=0`, {
      timeout: 5000
    }).catch(() => ({ data: { data: [] } }));

    // 获取抖音热点
    const douyinResponse = await axios.get(`${TOPHUB_API}/v2/GetAllInfoGzip?id=3&page=0`, {
      timeout: 5000
    }).catch(() => ({ data: { data: [] } }));

    // 获取小红书趋势
    const xhsResponse = await axios.get(`${TOPHUB_API}/v2/GetAllInfoGzip?id=4&page=0`, {
      timeout: 5000
    }).catch(() => ({ data: { data: [] } }));

    // 合并并格式化数据
    const topics = [];
    let idCounter = 1;

    // 微博热搜
    if (weiboResponse.data?.data) {
      weiboResponse.data.data.slice(0, 3).forEach((item, index) => {
        topics.push({
          id: String(idCounter++),
          title: item.Title || item.title,
          platform: 'weibo',
          heat: item.Heat ? Math.min(parseInt(item.Heat) / 10000, 100) : 95 - index * 3,
          category: '热搜',
          trending: index < 2,
          url: item.Url || item.url
        });
      });
    }

    // 抖音热点
    if (douyinResponse.data?.data) {
      douyinResponse.data.data.slice(0, 2).forEach((item, index) => {
        topics.push({
          id: String(idCounter++),
          title: item.Title || item.title,
          platform: 'douyin',
          heat: item.Heat ? Math.min(parseInt(item.Heat) / 10000, 98) : 92 - index * 5,
          category: '热点',
          trending: index === 0,
          url: item.Url || item.url
        });
      });
    }

    // 小红书趋势
    if (xhsResponse.data?.data) {
      xhsResponse.data.data.slice(0, 2).forEach((item, index) => {
        topics.push({
          id: String(idCounter++),
          title: item.Title || item.title,
          platform: 'xiaohongshu',
          heat: item.Heat ? Math.min(parseInt(item.Heat) / 1000, 96) : 88 - index * 4,
          category: '趋势',
          trending: index === 0,
          url: item.Url || item.url
        });
      });
    }

    // 如果API失败，返回备用数据
    if (topics.length === 0) {
      return res.json([
        { id: '1', title: '早秋穿搭指南', platform: 'xiaohongshu', heat: 98, category: '时尚', trending: true },
        { id: '2', title: '减脂餐打卡', platform: 'douyin', heat: 95, category: '美食', trending: true },
        { id: '3', title: '职场效率提升', platform: 'wechat', heat: 88, category: '职场', trending: false },
        { id: '4', title: '国庆旅游攻略', platform: 'xiaohongshu', heat: 92, category: '旅行', trending: true },
        { id: '5', title: '智能家居推荐', platform: 'douyin', heat: 85, category: '科技', trending: false },
      ]);
    }

    return res.json(topics);
  } catch (error) {
    console.error('Hot topics fetch error:', error.message);
    // 返回备用数据
    return res.json([
      { id: '1', title: '早秋穿搭指南', platform: 'xiaohongshu', heat: 98, category: '时尚', trending: true },
      { id: '2', title: '减脂餐打卡', platform: 'douyin', heat: 95, category: '美食', trending: true },
      { id: '3', title: '职场效率提升', platform: 'wechat', heat: 88, category: '职场', trending: false },
      { id: '4', title: '国庆旅游攻略', platform: 'xiaohongshu', heat: 92, category: '旅行', trending: true },
      { id: '5', title: '智能家居推荐', platform: 'douyin', heat: 85, category: '科技', trending: false },
    ]);
  }
};
