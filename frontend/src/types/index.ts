// 类型定义
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  subscription: 'free' | 'pro' | 'enterprise';
  credits: number;
  createdAt: string;
}

export interface Content {
  id: string;
  userId: string;
  prompt: string;
  title: string;
  content: string;
  images: string[];
  tags: string[];
  platform: 'xiaohongshu' | 'douyin' | 'wechat' | 'weibo';
  status: 'draft' | 'published' | 'scheduled';
  scheduledAt?: string;
  publishedAt?: string;
  analytics?: {
    views: number;
    likes: number;
    shares: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GenerateRequest {
  prompt: string;
  platform: 'xiaohongshu' | 'douyin' | 'wechat' | 'weibo';
  style?: string;
  imageCount?: number;
}

export interface GenerateResponse {
  title: string;
  content: string;
  images: string[];
  tags: string[];
  suggestedPlatforms: string[];
}

export interface PublishRequest {
  contentId: string;
  platforms: string[];
  scheduledTime?: string;
}

export interface HotTopic {
  id: string;
  title: string;
  platform: string;
  heat: number;
  category: string;
  trending: boolean;
}
