const { Service } = require('@volcengine/openapi');

// 初始化即梦服务
const getJimengService = () => {
  const accessKeyId = process.env.JIMENG_ACCESS_KEY_ID;
  const secretKeyRaw = process.env.JIMENG_SECRET_ACCESS_KEY || '';
  
  // 如果SecretKey是Base64编码，需要解码
  const secretAccessKey = secretKeyRaw.includes('=') && secretKeyRaw.length % 4 === 0
    ? Buffer.from(secretKeyRaw, 'base64').toString('utf-8')
    : secretKeyRaw;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Missing JIMENG_ACCESS_KEY_ID or JIMENG_SECRET_ACCESS_KEY');
  }

  const service = new Service({
    host: 'visual.volcengineapi.com',
    serviceName: 'cv',
    region: 'cn-north-1',
    accessKeyId,
    secretAccessKey,
  });

  return service;
};

// 提交图片生成任务
async function submitTask(prompt, count = 1) {
  const service = getJimengService();
  
  const body = {
    req_key: 'jimeng_t2i_v40',
    prompt: prompt,
    size: 2048 * 2048, // 2K分辨率
    force_single: count === 1,
  };

  try {
    const response = await service.fetchOpenAPI({
      Action: 'CVSync2AsyncSubmitTask',
      Version: '2022-08-31',
      body,
    });

    if (response.code !== 10000) {
      throw new Error(response.message || 'Submit task failed');
    }

    return response.data.task_id;
  } catch (error) {
    console.error('Submit task error:', error.response?.data || error.message);
    throw error;
  }
}

// 查询任务结果
async function getResult(taskId) {
  const service = getJimengService();

  const body = {
    req_key: 'jimeng_t2i_v40',
    task_id: taskId,
    req_json: JSON.stringify({ return_url: true }),
  };

  try {
    const response = await service.fetchOpenAPI({
      Action: 'CVSync2AsyncGetResult',
      Version: '2022-08-31',
      body,
    });

    if (response.code !== 10000) {
      throw new Error(response.message || 'Get result failed');
    }

    return response.data;
  } catch (error) {
    console.error('Get result error:', error.response?.data || error.message);
    throw error;
  }
}

// 等待任务完成
async function waitForResult(taskId, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await getResult(taskId);

    if (result.status === 'done') {
      return result;
    }

    if (result.status === 'failed' || result.status === 'expired') {
      throw new Error(`Task ${result.status}`);
    }

    // 等待2秒再查询
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error('Task timeout');
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

  try {
    const { prompt, count = 1 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('Generating images for:', prompt);

    // 1. 提交任务
    const taskId = await submitTask(prompt, count);
    console.log('Task submitted:', taskId);

    // 2. 等待任务完成
    const result = await waitForResult(taskId);
    console.log('Task completed:', result.status);

    // 3. 返回图片URL
    const images = result.image_urls || [];

    return res.json({
      success: true,
      prompt: prompt,
      task_id: taskId,
      images: images.map((url, index) => ({
        id: index + 1,
        url: url,
        width: 2048,
        height: 2048,
      })),
    });
  } catch (error) {
    console.error('Image generation error:', error.message);

    // 返回备用图片
    return res.json({
      success: true,
      prompt: req.body.prompt,
      images: [
        { id: 1, url: `https://picsum.photos/1024/1024?random=${Date.now()}`, width: 1024, height: 1024 },
        { id: 2, url: `https://picsum.photos/1024/1024?random=${Date.now() + 1}`, width: 1024, height: 1024 },
        { id: 3, url: `https://picsum.photos/1024/1024?random=${Date.now() + 2}`, width: 1024, height: 1024 },
      ],
      note: 'Using placeholder images',
      error: error.message,
    });
  }
};
