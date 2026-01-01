export default async function handler(req, res) {
  const info = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    headers: {
      'user-agent': req.headers['user-agent'],
      'x-vercel-original-uri': req.headers['x-vercel-original-uri'],
      'referer': req.headers['referer'],
      'host': req.headers['host']
    },
    env: {
      'NODE_ENV': process.env.NODE_ENV,
      'VERCEL_REGION': process.env.VERCEL_REGION
    }
  };
  
  console.log('Test endpoint called:', JSON.stringify(info, null, 2));
  
  res.json({
    success: true,
    message: 'Test endpoint is working!',
    info: info
  });
}
