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

export interface GenerateImageRequest {
  prompt: string;
  count?: number;
}

export interface GenerateImageResponse {
  success: boolean;
  prompt: string;
  task_id?: string;
  images: {
    id: number;
    url: string;
    width: number;
    height: number;
  }[];
  note?: string;
  error?: string;
}

export const contentApi = {
  // 生成内容
  generate: async (data: GenerateRequest): Promise<GenerateResponse> => {
    const response = await api.post('/generate', data);
    return response.data;
  },

  // 生成图片
  generateImage: async (data: GenerateImageRequest): Promise<GenerateImageResponse> => {
    const response = await api.post('/generate-image', data);
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
    const response = await api.post('/publish', data);
    return response.data;
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
    const response = await api.get('/hot-topics');
    return response.data;
  },
};

export default api;
