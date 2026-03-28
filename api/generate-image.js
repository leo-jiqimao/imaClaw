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

// 获取当前UTC时间
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

// URL encode
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

// 签名函数
function sign(method, path, query, headers, body, accessKey, secretKey, region, service) {
  const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
  
  const signedHeaders = {};
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (key === 'Content-Type' || key === 'Content-Md5' || key === 'Host' || 
        (key.startsWith('X-') && key !== 'X-Content-Sha256')) {
      signedHeaders[lowerKey] = value;
    }
  }
  
  if (signedHeaders.host) {
    const hostParts = signedHeaders.host.split(':');
    if (hostParts[1] === '80' || hostParts[1] === '443') {
      signedHeaders.host = hostParts[0];
    }
  }
  
  const sortedKeys = Object.keys(signedHeaders).sort();
  let signedHeadersStr = '';
  for (const key of sortedKeys) {
    signedHeadersStr += `${key}:${signedHeaders[key]}\n`;
  }
  const signedHeadersNames = sortedKeys.join(';');
  
  const canonicalRequest = [
    method.toUpperCase(),
    path,
    canonicalQuery(query),
    signedHeadersStr,
    signedHeadersNames,
    bodyHash
  ].join('\n');
  
  const xDate = headers['X-Date'];
  const credentialScope = `${xDate.substring(0, 8)}/${region}/${service}/request`;
  const stringToSign = [
    'HMAC-SHA256',
    xDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n');
  
  const signingKey = getSigningSecretKey(secretKey, xDate.substring(0, 8), region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  
  const credential = `${accessKey}/${credentialScope}`;
  const authorization = `HMAC-SHA256 Credential=${credential}, SignedHeaders=${signedHeadersNames}, Signature=${signature}`;
  
  return { authorization, bodyHash };
}

// 提交单个图片生成任务（force_single=true）
async function submitSingleTask(prompt, credentials) {
  const path = '/';
  const query = {
    Action: 'CVSync2AsyncSubmitTask',
    Version: '2022-08-31'
  };
  const url = `https://${API_HOST}${path}`;
  
  const body = JSON.stringify({
    req_key: 'jimeng_t2i_v40',
    prompt: prompt,
    size: 2048 * 2048,
    force_single: true, // 强制生成单张图，速度更快
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
  
  const response = await axios.post(fullUrl, body, { headers, timeout: 30000 });
  
  if (response.data.code !== 10000) {
    throw new Error(response.data.message || 'Submit task failed');
  }
  
  return response.data.data.task_id;
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
  
  const response = await axios.post(fullUrl, body, { headers, timeout: 30000 });
  
  if (response.data.code !== 10000) {
    throw new Error(response.data.message || 'Get result failed');
  }
  
  return response.data.data;
}

// 等待单个任务完成
async function waitForSingleResult(taskId, credentials, maxAttempts = 40) {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await getResult(taskId, credentials);
    
    if (result.status === 'done') {
      return result;
    }
    
    if (result.status === 'failed' || result.status === 'expired') {
      throw new Error(`Task ${result.status}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error('Task timeout');
}

// 分批并行生成多张图片（限制并发数避免 429）
async function generateMultipleImages(prompt, count, credentials) {
  console.log(`Generating ${count} images with batch processing...`);
  
  const MAX_CONCURRENT = 3; // 最多 3 个并行任务
  const images = [];
  
  // 分批处理
  for (let batchStart = 0; batchStart < count; batchStart += MAX_CONCURRENT) {
    const batchEnd = Math.min(batchStart + MAX_CONCURRENT, count);
    const batchSize = batchEnd - batchStart;
    
    console.log(`Processing batch ${batchStart}-${batchEnd}...`);
    
    // 提交当前批次任务
    const taskPromises = [];
    for (let i = batchStart; i < batchEnd; i++) {
      const enhancedPrompt = count > 1 
        ? `${prompt}，第${i + 1}张，不同角度`
        : prompt;
      taskPromises.push(submitSingleTask(enhancedPrompt, credentials));
    }
    
    const taskIds = await Promise.all(taskPromises);
    console.log('Batch task IDs:', taskIds);
    
    // 等待当前批次完成
    const resultPromises = taskIds.map(taskId => 
      waitForSingleResult(taskId, credentials)
    );
    
    const results = await Promise.all(resultPromises);
    
    // 收集当前批次图片
    results.forEach((result, idx) => {
      if (result.image_urls && result.image_urls.length > 0) {
        images.push({
          id: batchStart + idx + 1,
          url: result.image_urls[0],
          width: 2048,
          height: 2048,
        });
      }
    });
  }
  
  return images;
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

    console.log('Generating images for:', prompt, 'count:', count);

    // 限制最大数量为 9
    const actualCount = Math.min(count, 9);
    
    // 并行生成多张图片
    const images = await generateMultipleImages(prompt, actualCount, credentials);
    
    console.log(`Generated ${images.length} images`);

    return res.json({
      success: true,
      prompt: prompt,
      images: images,
    });
  } catch (error) {
    console.error('Image generation error:', error.message);

    // 返回备用图片
    const count = req.body.count || 1;
    return res.json({
      success: true,
      prompt: req.body.prompt,
      images: Array.from({ length: Math.min(count, 9) }, (_, i) => ({
        id: i + 1,
        url: `https://picsum.photos/1024/1024?random=${Date.now() + i}`,
        width: 1024,
        height: 1024,
      })),
      note: 'Using placeholder images',
      error: error.message,
    });
  }
};
