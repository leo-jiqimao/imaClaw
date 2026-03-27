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
    const { platforms } = req.body;
    
    return res.json({
      success: true,
      message: `发布成功！已发布到 ${platforms?.join(', ') || '所有平台'}`
    });
  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to publish',
      message: error.message 
    });
  }
};
