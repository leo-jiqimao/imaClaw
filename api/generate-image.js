const axios = require('axios');
const crypto = require('crypto');

// 火山引擎即梦API配置
const API_HOST = 'visual.volcengineapi.com';
const API_REGION = 'cn-north-1';
const API_SERVICE = 'cv';

// 获取环境变量
function getCredentials() {
  const accessKeyId = process.env.JIMENG_ACCESS_KEY_ID;
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

// HMAC-SHA256
function hmacSha256(key, msg) {
  return crypto.createHmac('sha256', key).update(msg).digest();
}

// 获取 Signing Key
function getSigningSecretKey(sk, date, region, service) {
  const kDate = hmacSha256(sk, date);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  return hmacSha256(kService, 'request');
}

// URL encode (保留某些字符不编码)
function urlEncode(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

// 构造 canonical query string
function canonicalQuery(query) {
  const pairs = [];
  for (const [key, value] of Object.entries(query)) {
    pairs.push([urlEncode(key), urlEncode(String(value))]);
  }
  pairs.sort((a, b) => a[0].localeCompare(b[0]));
  return pairs.map(([k, v]) => `${k}=${v}`).join('&');
}

// 火山引擎签名算法 (V4)
function sign(method, path, query, headers, body, ak, sk, region, service) {
  // 计算 body hash
  const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
  
  // 收集 signed headers (不包括 X-Content-Sha256)
  const signedHeaders = {};
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (key === 'Content-Type' || key === 'Content-Md5' || key === 'Host' || 
        (key.startsWith('X-') && key !== 'X-Content-Sha256')) {
      signedHeaders[lowerKey] = value;
    }
  }
  
  // 处理 host (去掉端口 80/443)
  if (signedHeaders.host) {
    const hostParts = signedHeaders.host.split(':');
    if (hostParts[1] === '80' || hostParts[1] === '443') {
      signedHeaders.host = hostParts[0];
    }
  }
  
  // 构造 signed headers string
  const sortedKeys = Object.keys(signedHeaders).sort();
  let signedHeadersStr = '';
  for (const key of sortedKeys) {
    signedHeadersStr += `${key}:${signedHeaders[key]}\n`;
  }
  const signedHeadersNames = sortedKeys.join(';');
  
  // 构造 canonical request
  const canonicalRequest = [
    method.toUpperCase(),
    path,
    canonicalQuery(query),
    signedHeadersStr,
    signedHeadersNames,
    bodyHash
  ].join('\n');
  
  console.log('Canonical Request:\n', canonicalRequest, '\n---');
  
  // 构造 string to sign
  const xDate = headers['X-Date'];
  const credentialScope = `${xDate.substring(0, 8)}/${region}/${service}/request`;
  const stringToSign = [
    'HMAC-SHA256',
    xDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n');
  
  console.log('String to Sign:\n', stringToSign, '\n---');
  
  // 计算签名
  const signingKey = getSigningSecretKey(sk, xDate.substring(0, 8), region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  
  // 构造 Authorization header
  const credential = `${ak}/${credentialScope}`;
  const authorization = `HMAC-SHA256 Credential=${credential}, SignedHeaders=${signedHeadersNames}, Signature=${signature}`;
  
  return { authorization, bodyHash };
}

// 提交图片生成任务
async function submitTask(prompt, count = 1, credentials) {
  const path = '/';
  const query = {
    Action: 'CVSync2AsyncSubmitTask',
    Version: '2022-08-31'
  };
  const url = `https://${API_HOST}${path}`;
  
  // 根据 count 调整 prompt，明确指定生成数量
  const enhancedPrompt = count > 1 
    ? `${prompt}，生成${count}张不同角度的图片`
    : prompt;
  
  const body = JSON.stringify({
    req_key: 'jimeng_t2i_v40',
    prompt: enhancedPrompt,
    size: 2048 * 2048,
    force_single: count === 1,
  });
  
  const xDate = getXDate();
  const headers = {
    'Content-Type': 'application/json',
    'Host': API_HOST,
    'X-Date': xDate
  };
  
  const { authorization, bodyHash } = sign('POST', path, query, headers, body, 
    credentials.accessKeyId, credentials.secretAccessKey, API_REGION, API_SERVICE);
  
  headers['X-Content-Sha256'] = bodyHash;
  headers['Authorization'] = authorization;
  
  const queryString = Object.entries(query).map(([k, v]) => `${k}=${v}`).join('&');
  const fullUrl = `${url}?${queryString}`;
  
  try {
    console.log('Request URL:', fullUrl);
    console.log('Headers:', JSON.stringify(headers, null, 2));
    const response = await axios.post(fullUrl, body, { headers, timeout: 30000 });
    console.log('Response:', JSON.stringify(response.data));
    
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
  const path = '/';
  const query = {
    Action: 'CVSync2AsyncGetResult',
    Version: '2022-08-31'
  };
  const url = `https://${API_HOST}${path}`;
  
  const body = JSON.stringify({
    req_key: 'jimeng_t2i_v40',
    task_id: taskId,
    req_json: JSON.stringify({ return_url: true })
  });
  
  const xDate = getXDate();
  const headers = {
    'Content-Type': 'application/json',
    'Host': API_HOST,
    'X-Date': xDate
  };
  
  const { authorization, bodyHash } = sign('POST', path, query, headers, body,
    credentials.accessKeyId, credentials.secretAccessKey, API_REGION, API_SERVICE);
  
  headers['X-Content-Sha256'] = bodyHash;
  headers['Authorization'] = authorization;
  
  const queryString = Object.entries(query).map(([k, v]) => `${k}=${v}`).join('&');
  const fullUrl = `${url}?${queryString}`;
  
  try {
    const response = await axios.post(fullUrl, body, { headers, timeout: 30000 });
    
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
async function waitForResult(taskId, credentials, count = 1, maxAttempts = 60) {
  // 根据图片数量调整超时时间（每张图约需10-15秒）
  const estimatedTime = Math.max(30, count * 15);
  const actualMaxAttempts = Math.max(maxAttempts, estimatedTime / 2);
  
  for (let i = 0; i < actualMaxAttempts; i++) {
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
  
  throw new Error(`Task timeout after ${actualMaxAttempts * 2} seconds`);
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

    // 2. 等待任务完成（根据图片数量调整超时）
    const result = await waitForResult(taskId, credentials, count);
    console.log('Task completed:', result.status, 'images:', result.image_urls?.length || 0);

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
