// Basit bir test endpoint'i - prerender'i test etmek için
export default async function handler(req, res) {
  console.log('='.repeat(50));
  console.log('TEST PRERENDER');
  console.log('='.repeat(50));
  console.log('req.url:', req.url);
  console.log('req.method:', req.method);
  console.log('User-Agent:', req.headers['user-agent']);
  console.log('X-Vercel-Original-URI:', req.headers['x-vercel-original-uri']);
  console.log('Referer:', req.headers['referer']);
  console.log('Host:', req.headers['host']);
  console.log('All headers:', Object.keys(req.headers));
  
  res.json({
    message: 'Prerender test endpoint',
    url: req.url,
    headers: {
      userAgent: req.headers['user-agent'],
      xVercelOriginalUri: req.headers['x-vercel-original-uri'],
      referer: req.headers['referer'],
      host: req.headers['host']
    }
  });
}
