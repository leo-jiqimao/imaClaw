const axios = require('axios');

const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY;
const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

async function generateContent(options) {
  const { prompt, platform, style, imageCount } = options;

  if (!MOONSHOT_API_KEY) {
    throw new Error('MOONSHOT_API_KEY is not set');
  }

  // 平台提示词映射
  const platformPrompts = {
    xiaohongshu: '小红书风格：亲切、种草、emoji丰富、用"姐妹们"开头',
    douyin: '抖音风格：简短有力、悬念开头、互动性强',
    wechat: '公众号风格：专业、深度、结构清晰',
    weibo: '微博风格：轻松、话题性强、适合传播'
  };

  const platformPrompt = platformPrompts[platform] || platformPrompts.xiaohongshu;

  const systemPrompt = `你是一位专业的社交媒体内容创作者，擅长创作${style}风格的内容。

要求：
1. ${platformPrompt}
2. 标题要吸引人，包含关键词
3. 正文要有价值，结构清晰
4. 推荐3-5个相关标签
5. 语气要${style === '种草' ? '真诚推荐' : style === '干货' ? '专业实用' : '轻松有趣'}

请按以下格式输出：

标题：[标题]

正文：
[正文内容]

标签：[标签1] [标签2] [标签3]`;

  const userPrompt = `请为以下主题创作一篇${platform}的内容：

主题：${prompt}
风格：${style}

请直接输出内容，不要有多余解释。`;

  try {
    const response = await axios.post(
      MOONSHOT_API_URL,
      {
        model: 'moonshot-v1-8k',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
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
    const result = parseAIResponse(aiResponse, prompt);
    
    // 生成占位图片
    result.images = generatePlaceholderImages(imageCount);
    
    return result;
  } catch (error) {
    console.error('Moonshot API error:', error.response?.data || error.message);
    throw new Error('Failed to generate content from AI');
  }
}

function parseAIResponse(response, originalPrompt) {
  // 提取标题
  const titleMatch = response.match(/标题：(.+)/);
  const title = titleMatch ? titleMatch[1].trim() : `${originalPrompt} | 超详细攻略`;

  // 提取正文
  const contentMatch = response.match(/正文：\n?([\s\S]+?)(?=标签：|$)/);
  let content = contentMatch ? contentMatch[1].trim() : response;

  // 提取标签
  const tagsMatch = response.match(/标签：(.+)/);
  let tags = [];
  if (tagsMatch) {
    tags = tagsMatch[1].split(/[#\s]+/).filter(t => t.trim());
  }
  if (tags.length === 0) {
    tags = ['种草', '攻略', '必看'];
  }

  return {
    title,
    content,
    images: [], // 稍后填充
    tags,
    suggestedPlatforms: ['xiaohongshu', 'douyin']
  };
}

function generatePlaceholderImages(count) {
  const images = [];
  for (let i = 0; i < count; i++) {
    // 使用 picsum 作为占位图
    images.push(`https://picsum.photos/800/600?random=${Date.now() + i}`);
  }
  return images;
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 处理 URL（Vercel 可能不带 /api 前缀）
  console.log('Request URL:', req.url);
  const url = req.url.replace(/^\/api/, '') || '/';
  console.log('Processed URL:', url);
  
  // 健康检查 - 支持多种路径格式
  if (url === '/health' || req.url === '/api/health' || req.url === '/health') {
    return res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  // AI 生成内容
  if ((url === '/generate' || req.url === '/api/generate') && req.method === 'POST') {
    try {
      const { prompt, platform, style, imageCount } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      console.log('Generating content for:', { prompt, platform, style });
      
      const result = await generateContent({
        prompt,
        platform: platform || 'xiaohongshu',
        style: style || '种草',
        imageCount: imageCount || 3
      });

      return res.json(result);
    } catch (error) {
      console.error('Generate error:', error);
      return res.status(500).json({ 
        error: 'Failed to generate content',
        message: error.message 
      });
    }
  }

  // 热点话题
  if ((url === '/hot-topics' || req.url === '/api/hot-topics') && req.method === 'GET') {
    const topics = [
      { id: '1', title: '早秋穿搭', platform: 'xiaohongshu', heat: 98, category: '时尚', trending: true },
      { id: '2', title: '减脂餐', platform: 'douyin', heat: 95, category: '美食', trending: true },
      { id: '3', title: '职场干货', platform: 'wechat', heat: 88, category: '职场', trending: false },
      { id: '4', title: '旅行攻略', platform: 'xiaohongshu', heat: 92, category: '旅行', trending: true },
      { id: '5', title: '智能家居', platform: 'douyin', heat: 85, category: '科技', trending: false },
    ];
    return res.json(topics);
  }

  // 保存内容
  if ((url === '/content' || req.url === '/api/content') && req.method === 'POST') {
    return res.json({ id: Date.now().toString(), ...req.body });
  }

  // 发布内容
  if ((url === '/publish' || req.url === '/api/publish') && req.method === 'POST') {
    return res.json({ success: true, message: 'Published successfully' });
  }

  return res.status(404).json({ error: 'Not found' });
};
// Deploy trigger
