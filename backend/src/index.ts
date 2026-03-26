import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { generateContent } from './services/moonshot';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(helmet());
app.use(cors({
  origin: ['https://imaclaw.vercel.app', 'http://localhost:5173'],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// 限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 每个IP 100次请求
});
app.use('/api/', limiter);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// AI 生成内容
app.post('/api/generate', async (req, res) => {
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

    res.json(result);
  } catch (error: any) {
    console.error('Generate error:', error);
    res.status(500).json({ 
      error: 'Failed to generate content',
      message: error.message 
    });
  }
});

// 保存内容
app.post('/api/content', (req, res) => {
  // TODO: 接入数据库
  res.json({ id: Date.now().toString(), ...req.body });
});

// 获取内容列表
app.get('/api/content', (req, res) => {
  // TODO: 从数据库获取
  res.json([]);
});

// 发布内容
app.post('/api/publish', (req, res) => {
  // TODO: 接入社媒API
  res.json({ success: true, message: 'Published successfully' });
});

// 热点话题
app.get('/api/hot-topics', (req, res) => {
  const topics = [
    { id: '1', title: '早秋穿搭', platform: 'xiaohongshu', heat: 98, category: '时尚', trending: true },
    { id: '2', title: '减脂餐', platform: 'douyin', heat: 95, category: '美食', trending: true },
    { id: '3', title: '职场干货', platform: 'wechat', heat: 88, category: '职场', trending: false },
    { id: '4', title: '旅行攻略', platform: 'xiaohongshu', heat: 92, category: '旅行', trending: true },
    { id: '5', title: '智能家居', platform: 'douyin', heat: 85, category: '科技', trending: false },
  ];
  res.json(topics);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
