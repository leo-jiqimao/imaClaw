import React, { useState } from 'react';
import {
  Card,
  Input,
  Button,
  Select,
  Slider,
  Radio,
  Space,
  Tag,
  message,
  Spin,
  Image,
  Empty,
  Divider,
  Tooltip,
} from 'antd';
import {
  EditOutlined,
  PictureOutlined,
  SendOutlined,
  ReloadOutlined,
  CopyOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { contentApi } from '../services/api';
import type { GenerateRequest, GenerateResponse } from '../types';

const { TextArea } = Input;
const { Option } = Select;

const Create: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [platform, setPlatform] = useState<'xiaohongshu' | 'douyin' | 'wechat' | 'weibo'>('xiaohongshu');
  const [style, setStyle] = useState('种草');
  const [imageCount, setImageCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [saved, setSaved] = useState(false);

  const platforms = [
    { value: 'xiaohongshu', label: '小红书', color: '#ff2442' },
    { value: 'douyin', label: '抖音', color: '#000000' },
    { value: 'wechat', label: '公众号', color: '#07c160' },
    { value: 'weibo', label: '微博', color: '#e6162d' },
  ];

  const styles = ['种草', '干货', '故事', '测评', '教程', '日常', '搞笑'];

  const hotPrompts = [
    '早秋穿搭分享',
    '减脂餐制作教程',
    '职场效率提升技巧',
    '周末短途旅行攻略',
    '新手化妆误区',
    '智能家居好物推荐',
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      message.warning('请输入创作主题');
      return;
    }

    setLoading(true);
    setSaved(false);
    
    try {
      const request: GenerateRequest = {
        prompt,
        platform,
        style,
        imageCount,
      };
      
      const response = await contentApi.generate(request);
      setResult(response);
      message.success('内容生成成功！');
    } catch (error) {
      message.error('生成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  };

  const handleSave = async () => {
    if (!result) return;
    
    try {
      await contentApi.save({
        prompt,
        title: result.title,
        content: result.content,
        images: result.images,
        tags: result.tags,
        platform,
        status: 'draft',
      });
      setSaved(true);
      message.success('保存成功！');
    } catch (error) {
      message.error('保存失败');
    }
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 24 }}>
        <EditOutlined /> AI内容创作
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* 左侧：输入区 */}
        <div>
          <Card title="📝 输入创作需求" style={{ marginBottom: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* 平台选择 */}
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  选择平台
                </label>
                <Radio.Group
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  buttonStyle="solid"
                >
                  {platforms.map((p) => (
                    <Radio.Button key={p.value} value={p.value}>
                      <span style={{ color: p.color }}>●</span> {p.label}
                    </Radio.Button>
                  ))}
                </Radio.Group>
              </div>

              {/* 主题输入 */}
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  创作主题 <span style={{ color: '#999' }}>(一句话描述你想创作的内容)</span>
                </label>
                <TextArea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="例如：早秋穿搭分享、减脂餐制作教程、职场效率提升技巧..."
                  rows={4}
                  maxLength={200}
                  showCount
                />
              </div>

              {/* 热门提示词 */}
              <div>
                <label style={{ display: 'block', marginBottom: 8, color: '#666' }}>
                  <BulbOutlined /> 热门主题
                </label>
                <Space wrap>
                  {hotPrompts.map((p) => (
                    <Tag
                      key={p}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setPrompt(p)}
                    >
                      {p}
                    </Tag>
                  ))}
                </Space>
              </div>

              {/* 风格选择 */}
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  内容风格
                </label>
                <Select value={style} onChange={setStyle} style={{ width: '100%' }}>
                  {styles.map((s) => (
                    <Option key={s} value={s}>{s}</Option>
                  ))}
                </Select>
              </div>

              {/* 图片数量 */}
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  生成图片数量: {imageCount}张
                </label>
                <Slider
                  min={1}
                  max={9}
                  value={imageCount}
                  onChange={setImageCount}
                  marks={{ 1: '1张', 3: '3张', 6: '6张', 9: '9张' }}
                />
              </div>

              {/* 生成按钮 */}
              <Button
                type="primary"
                size="large"
                icon={<ThunderboltOutlined />}
                onClick={handleGenerate}
                loading={loading}
                block
                style={{ height: 48, fontSize: 16 }}
              >
                {loading ? 'AI创作中...' : '开始创作'}
              </Button>
            </Space>
          </Card>

          {/* 使用提示 */}
          <Card size="small" style={{ background: '#f6ffed' }}>
            <h4 style={{ marginBottom: 12 }}>💡 创作小贴士</h4>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#666' }}>
              <li>输入越具体的描述，生成效果越好</li>
              <li>可以指定具体的场景、人群、风格</li>
              <li>生成后可手动编辑优化内容</li>
              <li>不同平台的文案风格会自动适配</li>
            </ul>
          </Card>
        </div>

        {/* 右侧：结果区 */}
        <div>
          <Card 
            title="✨ 创作结果" 
            extra={
              result && (
                <Space>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={handleRegenerate}
                    loading={loading}
                  >
                    重新生成
                  </Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    disabled={saved}
                  >
                    {saved ? '已保存' : '保存'}
                  </Button>
                </Space>
              )
            }
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <Spin size="large" />
                <p style={{ marginTop: 16, color: '#666' }}>AI正在创作中...</p>
              </div>
            ) : result ? (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* 标题 */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ fontWeight: 500 }}>标题</label>
                    <Button 
                      type="text" 
                      size="small" 
                      icon={<CopyOutlined />}
                      onClick={() => handleCopy(result.title)}
                    >
                      复制
                    </Button>
                  </div>
                  <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                    {result.title}
                  </div>
                </div>

                <Divider />

                {/* 正文 */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ fontWeight: 500 }}>正文内容</label>
                    <Button 
                      type="text" 
                      size="small" 
                      icon={<CopyOutlined />}
                      onClick={() => handleCopy(result.content)}
                    >
                      复制
                    </Button>
                  </div>
                  <div 
                    style={{ 
                      padding: 16, 
                      background: '#f5f5f5', 
                      borderRadius: 8,
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.8
                    }}
                  >
                    {result.content}
                  </div>
                </div>

                <Divider />

                {/* 图片 */}
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                    <PictureOutlined /> 配图
                  </label>
                  <Image.PreviewGroup>
                    <Space wrap>
                      {result.images.map((img, index) => (
                        <Image
                          key={index}
                          src={img}
                          width={120}
                          height={120}
                          style={{ borderRadius: 8, objectFit: 'cover' }}
                          alt={`配图${index + 1}`}
                        />
                      ))}
                    </Space>
                  </Image.PreviewGroup>
                </div>

                <Divider />

                {/* 标签 */}
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                    推荐标签
                  </label>
                  <Space wrap>
                    {result.tags.map((tag) => (
                      <Tag key={tag} color="blue">{tag}</Tag>
                    ))}
                  </Space>
                </div>

                <Divider />

                {/* 发布按钮 */}
                <Button
                  type="primary"
                  size="large"
                  icon={<SendOutlined />}
                  block
                  onClick={() => {
                    message.success('跳转到发布页面');
                  }}
                >
                  去发布
                </Button>
              </Space>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="输入创作主题，点击开始创作"
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Create;
