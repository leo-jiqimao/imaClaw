// API服务
import axios from 'axios';
import type { GenerateRequest, GenerateResponse, Content, PublishRequest, HotTopic } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const contentApi = {
  // 生成内容
  generate: async (data: GenerateRequest): Promise<GenerateResponse> => {
    const response = await api.post('/generate', data);
    return response.data;
  },

  // 保存内容
  save: async (data: Partial<Content>): Promise<Content> => {
    const response = await api.post('/content', data);
    return response.data;
  },

  // 获取内容列表
  getList: async (): Promise<Content[]> => {
    // const response = await api.get('/content');
    // return response.data;
    return [];
  },

  // 获取单个内容
  getById: async (id: string): Promise<Content> => {
    const response = await api.get(`/content/${id}`);
    return response.data;
  },
};

export const publishApi = {
  // 发布内容
  publish: async (data: PublishRequest): Promise<{ success: boolean; message: string }> => {
    // TODO: 接入真实API
    // const response = await api.post('/publish', data);
    // return response.data;
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      success: true,
      message: `发布成功！已发布到 ${data.platforms.join(', ')}`,
    };
  },

  // 获取发布状态
  getStatus: async (contentId: string): Promise<any> => {
    const response = await api.get(`/publish/status/${contentId}`);
    return response.data;
  },
};

export const hotTopicsApi = {
  // 获取热点话题
  getList: async (): Promise<HotTopic[]> => {
    // TODO: 接入真实API
    await new Promise(resolve => setTimeout(resolve, 500));
    return [
      { id: '1', title: '早秋穿搭', platform: 'xiaohongshu', heat: 98, category: '时尚', trending: true },
      { id: '2', title: '减脂餐', platform: 'douyin', heat: 95, category: '美食', trending: true },
      { id: '3', title: '职场干货', platform: 'wechat', heat: 88, category: '职场', trending: false },
      { id: '4', title: '旅行攻略', platform: 'xiaohongshu', heat: 92, category: '旅行', trending: true },
      { id: '5', title: '智能家居', platform: 'douyin', heat: 85, category: '科技', trending: false },
    ];
  },
};

export default api;
