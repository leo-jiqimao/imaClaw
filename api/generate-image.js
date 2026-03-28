const axios = require('axios');
const crypto = require('crypto');

// 火山引擎即梦API配置
const API_HOST = 'visual.volcengineapi.com';
const API_REGION = 'cn-north-1';
const API_SERVICE = 'cv';

// 获取环境变量
function getCredentials() {
  const accessKeyId = process.env.JIMENG_ACCESS_KEY_ID;
  // SecretKey 直接使用，不需要Base64解码
  const secretAccessKey = process.env.JIMENG_SECRET_ACCESS_KEY || '';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Missing JIMENG_ACCESS_KEY_ID or JIMENG_SECRET_ACCESS_KEY');
  }

  return { accessKeyId, secretAccessKey };
}

// 获取当前UTC时间（火山引擎格式：YYYYMMDD'T'HHMMSS'Z'）
function getXDate() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

// 火山引擎签名算法 (HMAC-SHA256)
function sign(method, uri, queryString, headers, body, secretKey) {
  const contentType = headers['content-type'] || 'application/json';
  
  // 计算 x-content-sha256
  const contentSha256 = crypto.createHash('sha256').update(body).digest('hex');
  
  // 构造 stringToSign
  const stringToSign = [
    method.toUpperCase(),
    contentSha256,
    contentType,
    headers['x-date'],
    `x-date:${headers['x-date']}`,
    uri + (queryString ? '?' + queryString : '')
  ].join('\n');
  
  // 计算 signing key
  const shortDate = headers['x-date'].substring(0, 8);
  const kDate = crypto.createHmac('sha256', secretKey).update(shortDate).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(API_REGION).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(API_SERVICE).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('request').digest();
  
  // 计算签名
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  
  return { signature, contentSha256, stringToSign };
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
  
  const xDate = getXDate();
  const headers = {
    'content-type': 'application/json',
    'x-date': xDate,
    'host': API_HOST
  };
  
  const { signature, contentSha256 } = sign('POST', uri, queryString, headers, body, credentials.secretAccessKey);
  
  // 添加 x-content-sha256 header
  headers['x-content-sha256'] = contentSha256;
  
  headers['authorization'] = `HMAC-SHA256 Credential=${credentials.accessKeyId}/${xDate.substring(0, 8)}/${API_REGION}/${API_SERVICE}/request, SignedHeaders=content-type;host;x-content-sha256;x-date, Signature=${signature}`;
  
  try {
    console.log('Submitting task with x-date:', xDate);
    console.log('Headers:', JSON.stringify(headers));
    console.log('Body:', body);
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
  
  const xDate = getXDate();
  const headers = {
    'content-type': 'application/json',
    'x-date': xDate,
    'host': API_HOST
  };
  
  const { signature, contentSha256 } = sign('POST', uri, queryString, headers, body, credentials.secretAccessKey);
  
  headers['x-content-sha256'] = contentSha256;
  headers['authorization'] = `HMAC-SHA256 Credential=${credentials.accessKeyId}/${xDate.substring(0, 8)}/${API_REGION}/${API_SERVICE}/request, SignedHeaders=content-type;host;x-content-sha256;x-date, Signature=${signature}`;
  
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
