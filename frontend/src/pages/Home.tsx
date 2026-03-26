import React from 'react';
import { Card, Statistic, Row, Col, Button, List, Tag, Badge } from 'antd';
import {
  EditOutlined,
  RocketOutlined,
  EyeOutlined,
  LikeOutlined,
  ShareAltOutlined,
  FireOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { hotTopicsApi } from '../services/api';
import type { HotTopic } from '../types';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [hotTopics, setHotTopics] = React.useState<HotTopic[]>([]);

  React.useEffect(() => {
    hotTopicsApi.getList().then(setHotTopics);
  }, []);

  const stats = [
    { title: '本月创作', value: 28, icon: <EditOutlined />, color: '#1890ff' },
    { title: '已发布', value: 24, icon: <RocketOutlined />, color: '#52c41a' },
    { title: '总阅读量', value: 15800, icon: <EyeOutlined />, color: '#722ed1' },
    { title: '获赞数', value: 2300, icon: <LikeOutlined />, color: '#eb2f96' },
  ];

  const quickActions = [
    { 
      title: 'AI创作', 
      desc: '输入关键词，一键生成图文内容',
      icon: <EditOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
      action: () => navigate('/create'),
      color: '#e6f7ff'
    },
    { 
      title: '批量发布', 
      desc: '一键发布到多个社交平台',
      icon: <RocketOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
      action: () => navigate('/publish'),
      color: '#f6ffed'
    },
    { 
      title: '热点追踪', 
      desc: '实时捕捉各平台热门话题',
      icon: <FireOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />,
      action: () => navigate('/topics'),
      color: '#fff1f0'
    },
  ];

  return (
    <div>
      {/* 欢迎语 */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>
          👋 你好，Leo！
        </h1>
        <p style={{ color: '#666', fontSize: 16 }}>
          今天想创作什么内容？让AI帮你事半功倍！
        </p>
      </div>

      {/* 数据统计 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {stats.map((stat, index) => (
          <Col span={6} key={index}>
            <Card bordered={false} style={{ background: '#fafafa' }}>
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={React.cloneElement(stat.icon as React.ReactElement, { style: { color: stat.color } })}
                valueStyle={{ color: stat.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 快捷操作 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {quickActions.map((action, index) => (
          <Col span={8} key={index}>
            <Card
              hoverable
              onClick={action.action}
              style={{ background: action.color, border: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {action.icon}
                <div>
                  <h3 style={{ margin: 0, marginBottom: 4 }}>{action.title}</h3>
                  <p style={{ margin: 0, color: '#666' }}>{action.desc}</p>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 热点话题 */}
      <Row gutter={16}>
        <Col span={16}>
          <Card 
            title="🔥 实时热点" 
            extra={<Button type="link">查看全部</Button>}
          >
            <List
              dataSource={hotTopics}
              renderItem={(topic) => (
                <List.Item
                  actions={[
                    <Button 
                      type="primary" 
                      size="small"
                      onClick={() => navigate('/create', { state: { prompt: topic.title } })}
                    >
                      创作
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {topic.title}
                        {topic.trending && (
                          <Badge count="爆" style={{ backgroundColor: '#ff4d4f' }} />
                        )}
                      </div>
                    }
                    description={
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <Tag size="small">{topic.platform}</Tag>
                        <Tag size="small" color="red">热度 {topic.heat}</Tag>
                        <Tag size="small">{topic.category}</Tag>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="📊 创作建议">
            <div style={{ padding: '12px 0' }}>
              <p>💡 <strong>最佳发布时间</strong></p>
              <p style={{ color: '#666' }}>小红书：晚上 8-10 点</p>
              <p style={{ color: '#666' }}>抖音：中午 12-13 点，晚上 6-9 点</p>
            </div>
            <div style={{ padding: '12px 0' }}>
              <p>🎯 <strong>本周热门标签</strong></p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <Tag>早秋穿搭</Tag>
                <Tag>减脂餐</Tag>
                <Tag>职场干货</Tag>
                <Tag>旅行攻略</Tag>
              </div>
            </div>
            <Button type="primary" block style={{ marginTop: 16 }} onClick={() => navigate('/create')}>
              立即创作 <ArrowRightOutlined />
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Home;
