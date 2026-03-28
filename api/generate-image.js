const axios = require('axios');
const crypto = require('crypto');

// 火山引擎即梦API配置
const API_HOST = 'visual.volcengineapi.com';
const API_REGION = 'cn-north-1';
const API_SERVICE = 'cv';

// 获取环境变量
function getCredentials() {
  const accessKeyId = process.env.JIMENG_ACCESS_KEY_ID;
  const secretKeyRaw = process.env.JIMENG_SECRET_ACCESS_KEY || '';
  
  // 如果SecretKey是Base64编码，需要解码
  const secretAccessKey = secretKeyRaw.includes('=') && secretKeyRaw.length % 4 === 0
    ? Buffer.from(secretKeyRaw, 'base64').toString('utf-8')
    : secretKeyRaw;

  console.log('AccessKeyId:', accessKeyId ? '已设置' : '未设置');
  console.log('SecretAccessKey:', secretAccessKey ? '已设置' : '未设置');

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Missing JIMENG_ACCESS_KEY_ID or JIMENG_SECRET_ACCESS_KEY');
  }

  return { accessKeyId, secretAccessKey };
}

// 火山引擎签名算法 (HMAC-SHA256)
function sign(method, uri, queryString, headers, body, secretKey) {
  const contentType = headers['content-type'] || 'application/json';
  const contentMD5 = crypto.createHash('md5').update(body).digest('base64');
  
  const stringToSign = [
    method.toUpperCase(),
    contentMD5,
    contentType,
    headers['x-date'],
    'x-date:' + headers['x-date'],
    uri + (queryString ? '?' + queryString : '')
  ].join('\n');
  
  const signKey = crypto.createHmac('sha256', secretKey)
    .update(headers['x-date'].substring(0, 8))
    .digest('hex');
  
  const signature = crypto.createHmac('sha256', signKey)
    .update(stringToSign)
    .digest('base64');
  
  return signature;
}

// 提交图片生成任务
async function submitTask(prompt, count = 1, credentials) {
  const uri = '/';
  const queryString = 'Action=CVSync2AsyncSubmitTask&Version=2022-08-31';
  const url = `https://${API_HOST}${uri}?${queryString}`;
  
  const body = JSON.stringify({
    req_key: 'jimeng_t2i_v40',
    prompt: prompt,
    size: 2048 * 2048,
    force_single: count === 1,
  });
  
  const now = new Date().toISOString().replace(/\.[0-9]{3}Z/, 'Z');
  const headers = {
    'content-type': 'application/json',
    'x-date': now,
    'host': API_HOST
  };
  
  const signature = sign('POST', uri, queryString, headers, body, credentials.secretAccessKey);
  
  headers['authorization'] = `HMAC-SHA256 Credential=${credentials.accessKeyId}/${now.substring(0, 8)}/${API_REGION}/${API_SERVICE}/request, SignedHeaders=host;x-date, Signature=${signature}`;
  
  try {
    console.log('Submitting task...');
    const response = await axios.post(url, body, { headers, timeout: 30000 });
    console.log('Submit response:', JSON.stringify(response.data));
    
    if (response.data.code !== 10000) {
      throw new Error(response.data.message || 'Submit task failed');
    }
    
    return response.data.data.task_id;
  } catch (error) {
    console.error('Submit task error:', error.response?.data || error.message);
    throw error;
  }
}

// 查询任务结果
async function getResult(taskId, credentials) {
  const uri = '/';
  const queryString = 'Action=CVSync2AsyncGetResult&Version=2022-08-31';
  const url = `https://${API_HOST}${uri}?${queryString}`;
  
  const body = JSON.stringify({
    req_key: 'jimeng_t2i_v40',
    task_id: taskId,
    req_json: JSON.stringify({ return_url: true })
  });
  
  const now = new Date().toISOString().replace(/\.[0-9]{3}Z/, 'Z');
  const headers = {
    'content-type': 'application/json',
    'x-date': now,
    'host': API_HOST
  };
  
  const signature = sign('POST', uri, queryString, headers, body, credentials.secretAccessKey);
  
  headers['authorization'] = `HMAC-SHA256 Credential=${credentials.accessKeyId}/${now.substring(0, 8)}/${API_REGION}/${API_SERVICE}/request, SignedHeaders=host;x-date, Signature=${signature}`;
  
  try {
    const response = await axios.post(url, body, { headers, timeout: 30000 });
    
    if (response.data.code !== 10000) {
      throw new Error(response.data.message || 'Get result failed');
    }
    
    return response.data.data;
  } catch (error) {
    console.error('Get result error:', error.response?.data || error.message);
    throw error;
  }
}

// 等待任务完成
async function waitForResult(taskId, credentials, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await getResult(taskId, credentials);
    
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
    const credentials = getCredentials();
    const { prompt, count = 1 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('Generating images for:', prompt);

    // 1. 提交任务
    const taskId = await submitTask(prompt, count, credentials);
    console.log('Task submitted:', taskId);

    // 2. 等待任务完成
    const result = await waitForResult(taskId, credentials);
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
