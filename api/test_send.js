const axios = require('axios');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function main() {
  // 1. 生成图片
  console.log('生成图片...');
  const genResponse = await axios.post('https://imaclaw.vercel.app/api/generate-image', {
    prompt: '赛博朋克城市夜景，霓虹灯，高科技',
    count: 1
  });
  
  if (!genResponse.data.success || genResponse.data.images.length === 0) {
    throw new Error('图片生成失败');
  }
  
  const imageUrl = genResponse.data.images[0].url;
  console.log('图片URL:', imageUrl);
  
  // 2. 下载图片
  console.log('下载图片...');
  const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  fs.writeFileSync('/tmp/test_image.jpg', imageResponse.data);
  console.log('图片已保存');
  
  // 3. 用 skill 发送
  console.log('发送图片...');
  const { stdout, stderr } = await execPromise(
    `${process.env.HOME}/.openclaw/workspace/skills/leo-feishu-send-image/scripts/send-image.sh /tmp/test_image.jpg ou_517deb17a9c48bb88638bb701e0a4f50`
  );
  console.log(stdout);
  if (stderr) console.error(stderr);
}

main().catch(console.error);
