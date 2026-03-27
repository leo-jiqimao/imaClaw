const axios = require('axios');

const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY;
const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, platform, style, imageCount } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // 调用 Moonshot API
    const response = await axios.post(
      MOONSHOT_API_URL,
      {
        model: 'moonshot-v1-8k',
        messages: [
          { 
            role: 'system', 
            content: `你是一位专业的${platform || '小红书'}内容创作者，擅长创作${style || '种草'}风格的内容。`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const aiResponse = response.data.choices[0].message.content;
    
    // 解析 AI 输出
    const result = {
      title: aiResponse.match(/标题：(.+)/)?.[1] || `${prompt} | 超详细攻略`,
      content: aiResponse.match(/正文：\n?([\s\S]+?)(?=标签：|$)/)?.[1] || aiResponse,
      tags: ['种草', '攻略', '必看'],
      images: Array(imageCount || 3).fill(null).map((_, i) => `https://picsum.photos/800/600?random=${Date.now() + i}`),
      platform: platform || 'xiaohongshu',
      style: style || '种草'
    };

    return res.json(result);
  } catch (error) {
    console.error('Generate error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate content',
      message: error.message 
    });
  }
};
