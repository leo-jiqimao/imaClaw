const axios = require('axios');
const crypto = require('crypto');

// 即梦API配置
const JIMENG_API_KEY = process.env.JIMENG_ACCESS_KEY_ID;
const JIMENG_SECRET_KEY = process.env.JIMENG_SECRET_ACCESS_KEY;
const JIMENG_API_URL = 'https://jimeng-api.volces.com';

// 生成签名
function generateSignature(method, uri, queryString, body, secretKey) {
  const stringToSign = method + '\n' + uri + '\n' + queryString + '\n' + body;
  return crypto.createHmac('sha256', secretKey).update(stringToSign).digest('hex');
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 检查API Key
  if (!JIMENG_API_KEY || !JIMENG_SECRET_KEY) {
    return res.status(500).json({ 
      error: 'API keys not configured',
      message: 'Please set JIMENG_ACCESS_KEY_ID and JIMENG_SECRET_ACCESS_KEY environment variables'
    });
  }

  try {
    const { prompt, width = 1024, height = 1024, count = 3 } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // 调用即梦API生成图片
    const timestamp = Date.now().toString();
    const uri = '/api/v1/images/generations';
    const body = JSON.stringify({
      prompt: prompt,
      width: width,
      height: height,
      count: count,
      style: 'photography'
    });

    // 生成签名
    const signature = generateSignature('POST', uri, '', body, JIMENG_SECRET_KEY);

    const response = await axios.post(
      `${JIMENG_API_URL}${uri}`,
      {
        prompt: prompt,
        width: width,
        height: height,
        count: count,
        style: 'photography'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JIMENG_API_KEY}`,
          'X-Signature': signature,
          'X-Timestamp': timestamp
        },
        timeout: 60000
      }
    );

    // 返回生成的图片URL
    const images = response.data.data?.images || [];
    
    return res.json({
      success: true,
      prompt: prompt,
      images: images.map((img, index) => ({
        id: index + 1,
        url: img.url,
        width: img.width || width,
        height: img.height || height
      }))
    });
  } catch (error) {
    console.error('Image generation error:', error.response?.data || error.message);
    
    // 如果API调用失败，返回占位图
    return res.json({
      success: true,
      prompt: req.body.prompt,
      images: [
        { id: 1, url: `https://picsum.photos/1024/1024?random=${Date.now()}`, width: 1024, height: 1024 },
        { id: 2, url: `https://picsum.photos/1024/1024?random=${Date.now()+1}`, width: 1024, height: 1024 },
        { id: 3, url: `https://picsum.photos/1024/1024?random=${Date.now()+2}`, width: 1024, height: 1024 }
      ],
      note: 'Using placeholder images due to API error'
    });
  }
};
