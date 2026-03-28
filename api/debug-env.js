module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const accessKeyId = process.env.JIMENG_ACCESS_KEY_ID;
  const secretAccessKey = process.env.JIMENG_SECRET_ACCESS_KEY;

  res.json({
    status: 'ok',
    env: {
      accessKeyId: accessKeyId ? `${accessKeyId.substring(0, 10)}...` : 'NOT SET',
      secretAccessKey: secretAccessKey ? `${secretAccessKey.substring(0, 10)}...` : 'NOT SET',
      nodeEnv: process.env.NODE_ENV,
    },
    timestamp: new Date().toISOString(),
  });
};
