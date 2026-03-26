import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Select,
  DatePicker,
  Checkbox,
  message,
  Tooltip,
  Badge,
  Progress,
  Empty,
} from 'antd';
import {
  RocketOutlined,
  EyeOutlined,
  LikeOutlined,
  ShareAltOutlined,
  CommentOutlined,
  ScheduleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { publishApi } from '../services/api';
import type { Content } from '../types';
import dayjs from 'dayjs';

const { Option } = Select;

const Publish: React.FC = () => {
  const [contents] = useState<Content[]>([
    {
      id: '1',
      title: '早秋穿搭 | 5套look让你美翻天',
      content: '今天给大家分享早秋穿搭...',
      platform: 'xiaohongshu',
      status: 'draft',
      createdAt: '2024-03-26T10:00:00Z',
      updatedAt: '2024-03-26T10:00:00Z',
      images: ['https://picsum.photos/800/600?random=1'],
      tags: ['早秋穿搭', 'OOTD', '种草'],
      userId: '1',
      prompt: '早秋穿搭分享',
    },
    {
      id: '2',
      title: '减脂餐制作教程',
      content: '健康减脂餐做法...',
      platform: 'douyin',
      status: 'published',
      publishedAt: '2024-03-25T08:00:00Z',
      createdAt: '2024-03-24T10:00:00Z',
      updatedAt: '2024-03-25T08:00:00Z',
      images: ['https://picsum.photos/800/600?random=2'],
      tags: ['减脂餐', '健康', '美食'],
      userId: '1',
      prompt: '减脂餐制作',
      analytics: {
        views: 12500,
        likes: 890,
        shares: 234,
      },
    },
  ]);
  
  const [publishModalVisible, setPublishModalVisible] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [form] = Form.useForm();

  const platforms = [
    { value: 'xiaohongshu', label: '小红书', icon: '📕', color: '#ff2442' },
    { value: 'douyin', label: '抖音', icon: '🎵', color: '#000000' },
    { value: 'wechat', label: '公众号', icon: '💬', color: '#07c160' },
    { value: 'weibo', label: '微博', icon: '👁️', color: '#e6162d' },
    { value: 'bilibili', label: 'B站', icon: '📺', color: '#00a1d6' },
  ];

  const handlePublish = async (content: Content) => {
    setSelectedContent(content);
    setPublishModalVisible(true);
  };

  const handlePublishSubmit = async (values: any) => {
    if (!selectedContent) return;

    setPublishing(true);
    
    try {
      const response = await publishApi.publish({
        contentId: selectedContent.id,
        platforms: values.platforms,
        scheduledTime: values.scheduledTime?.format(),
      });

      if (response.success) {
        message.success(values.scheduledTime ? '定时发布设置成功' : '发布成功！');
        setPublishModalVisible(false);
        form.resetFields();
      }
    } catch (error) {
      message.error('发布失败，请重试');
    } finally {
      setPublishing(false);
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
      draft: { color: 'default', icon: <ClockCircleOutlined />, text: '草稿' },
      scheduled: { color: 'processing', icon: <ScheduleOutlined />, text: '定时发布' },
      publishing: { color: 'warning', icon: <SyncOutlined spin />, text: '发布中' },
      published: { color: 'success', icon: <CheckCircleOutlined />, text: '已发布' },
      failed: { color: 'error', icon: <CloseCircleOutlined />, text: '发布失败' },
    };
    const statusInfo = statusMap[status];
    return (
      <Tag icon={statusInfo.icon} color={statusInfo.color}>
        {statusInfo.text}
      </Tag>
    );
  };

  const columns = [
    {
      title: '内容',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Content) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src={record.images[0]}
            alt="cover"
            style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }}
          />
          <div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>{text}</div>
            <Space size="small">
              {record.tags?.map((tag) => (
                <Tag key={tag} size="small">{tag}</Tag>
              ))}
            </Space>
          </div>
        </div>
      ),
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      render: (platform: string) => {
        const p = platforms.find((p) => p.value === platform);
        return (
          <Tag color={p?.color}>
            {p?.icon} {p?.label}
          </Tag>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: getStatusTag,
    },
    {
      title: '数据',
      key: 'analytics',
      render: (_: any, record: Content) => {
        if (!record.analytics) return '-';
        return (
          <Space size="large">
            <Tooltip title="阅读量">
              <span><EyeOutlined /> {record.analytics.views}</span>
            </Tooltip>
            <Tooltip title="点赞">
              <span><LikeOutlined /> {record.analytics.likes}</span>
            </Tooltip>
            <Tooltip title="分享">
              <span><ShareAltOutlined /> {record.analytics.shares}</span>
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: '发布时间',
      dataIndex: 'publishedAt',
      key: 'publishedAt',
      render: (date: string) => date ? dayjs(date).format('MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Content) => (
        <Space>
          {record.status === 'draft' && (
            <Button
              type="primary"
              size="small"
              icon={<RocketOutlined />}
              onClick={() => handlePublish(record)}
            >
              发布
            </Button>
          )}
          {record.status === 'published' && (
            <Button size="small" icon={<EyeOutlined />}>
              查看
            </Button>
          )}
          <Button size="small">编辑</Button>
          <Button size="small" danger>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>
          <RocketOutlined /> 内容发布
        </h2>
        <Space>
          <Button icon={<SyncOutlined />}>刷新状态</Button>
          <Button type="primary">批量发布</Button>
        </Space>
      </div>

      {/* 发布统计 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>12</div>
            <div style={{ color: '#666' }}>待发布</div>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>45</div>
            <div style={{ color: '#666' }}>已发布</div>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>128.5K</div>
            <div style={{ color: '#666' }}>总阅读量</div>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#eb2f96' }}>8.9K</div>
            <div style={{ color: '#666' }}>总获赞</div>
          </div>
        </Card>
      </div>

      {/* 平台状态 */}
      <Card title="平台连接状态" style={{ marginBottom: 24 }}>
        <Space size="large">
          {platforms.slice(0, 4).map((platform) => (
            <div key={platform.value} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge status="success" />
              <span>{platform.icon}</span>
              <span>{platform.label}</span>
              <Tag color="success">已连接</Tag>
            </div>
          ))}
        </Space>
      </Card>

      {/* 内容列表 */}
      <Card title="内容列表">
        <Table
          columns={columns}
          dataSource={contents}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 发布弹窗 */}
      <Modal
        title="发布内容"
        open={publishModalVisible}
        onCancel={() => setPublishModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedContent && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handlePublishSubmit}
            initialValues={{
              platforms: [selectedContent.platform],
            }}
          >
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>{selectedContent.title}</div>
              <div style={{ color: '#666', fontSize: 12 }}>
                创建时间: {dayjs(selectedContent.createdAt).format('YYYY-MM-DD HH:mm')}
              </div>
            </div>

            <Form.Item
              name="platforms"
              label="选择发布平台"
              rules={[{ required: true, message: '请至少选择一个平台' }]}
            >
              <Checkbox.Group>
                <Space direction="vertical">
                  {platforms.map((platform) => (
                    <Checkbox key={platform.value} value={platform.value}>
                      <span style={{ marginRight: 4 }}>{platform.icon}</span>
                      {platform.label}
                      {platform.value === selectedContent.platform && (
                        <Tag size="small" style={{ marginLeft: 8 }}>推荐</Tag>
                      )}
                    </Checkbox>
                  ))}
                </Space>
              </Checkbox.Group>
            </Form.Item>

            <Form.Item name="scheduledTime" label="定时发布（可选）">
              <DatePicker
                showTime
                style={{ width: '100%' }}
                placeholder="立即发布"
                disabledDate={(current) => current && current < dayjs().startOf('day')}
              />
            </Form.Item>

            <Form.Item>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={() => setPublishModalVisible(false)}>取消</Button>
                <Button type="primary" htmlType="submit" loading={publishing} icon={<RocketOutlined />}>
                  {publishing ? '发布中...' : '确认发布'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default Publish;
