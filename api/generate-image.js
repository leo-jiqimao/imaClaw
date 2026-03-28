const axios = require('axios');
const crypto = require('crypto');

// 火山引擎即梦API配置
const ACCESS_KEY_ID = process.env.JIMENG_ACCESS_KEY_ID;
// Secret Key 可能是 Base64 编码的，需要解码
const SECRET_ACCESS_KEY_RAW = process.env.JIMENG_SECRET_ACCESS_KEY || '';
const SECRET_ACCESS_KEY = SECRET_ACCESS_KEY_RAW.includes('=') && SECRET_ACCESS_KEY_RAW.length % 4 === 0
  ? Buffer.from(SECRET_ACCESS_KEY_RAW, 'base64').toString('utf-8')
  : SECRET_ACCESS_KEY_RAW;
const API_HOST = 'visual.volcengineapi.com';
const API_REGION = 'cn-north-1';
const API_SERVICE = 'cv';

// 火山引擎签名算法
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
async function submitTask(prompt, count = 3) {
  const uri = '/';
  const queryString = 'Action=CVSync2AsyncSubmitTask&Version=2022-08-31';
  const url = `https://${API_HOST}${uri}?${queryString}`;
  
  const body = JSON.stringify({
    req_key: 'jimeng_t2i_v40',
    prompt: prompt,
    size: 2048 * 2048, // 2K分辨率
    force_single: count === 1,
    // width: 2048,
    // height: 2048
  });
  
  const now = new Date().toISOString().replace(/\.[0-9]{3}Z/, 'Z');
  const headers = {
    'content-type': 'application/json',
    'x-date': now,
    'host': API_HOST
  };
  
  const signature = sign('POST', uri, queryString, headers, body, SECRET_ACCESS_KEY);
  
  headers['authorization'] = `HMAC-SHA256 Credential=${ACCESS_KEY_ID}/${now.substring(0, 8)}/${API_REGION}/${API_SERVICE}/request, SignedHeaders=host;x-date, Signature=${signature}`;
  
  try {
    const response = await axios.post(url, body, { headers, timeout: 30000 });
    
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
async function getResult(taskId) {
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
  
  const signature = sign('POST', uri, queryString, headers, body, SECRET_ACCESS_KEY);
  
  headers['authorization'] = `HMAC-SHA256 Credential=${ACCESS_KEY_ID}/${now.substring(0, 8)}/${API_REGION}/${API_SERVICE}/request, SignedHeaders=host;x-date, Signature=${signature}`;
  
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

  if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
    return res.status(500).json({ 
      error: 'API keys not configured',
      message: 'Please set JIMENG_ACCESS_KEY_ID and JIMENG_SECRET_ACCESS_KEY'
    });
  }

  try {
    const { prompt, count = 3 } = req.body;
    
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
        height: 2048
      }))
    });
    
  } catch (error) {
    console.error('Image generation error:', error.message);
    
    // 返回备用图片
    return res.json({
      success: true,
      prompt: req.body.prompt,
      images: [
        { id: 1, url: `https://picsum.photos/1024/1024?random=${Date.now()}`, width: 1024, height: 1024 },
        { id: 2, url: `https://picsum.photos/1024/1024?random=${Date.now()+1}`, width: 1024, height: 1024 },
        { id: 3, url: `https://picsum.photos/1024/1024?random=${Date.now()+2}`, width: 1024, height: 1024 }
      ],
      note: 'Using placeholder images',
      error: error.message
    });
  }
};
