const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

export default async function handler(req, res) {
  const url = req.url;
  
  // Bot detection
  const isBot = detectBot(req.headers['user-agent']);
  
  if (!isBot) {
    // Normal kullanıcı - index.html döndür
    return res.redirect('/index.html');
  }
  
  try {
    // Bot ise - sayfayı render et
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    
    const page = await browser.newPage();
    
    // Sayfayı yükle ve JavaScript bekle
    await page.goto(`https://soneryilmaz.vercel.app${url}`, {
      waitUntil: 'networkidle2',
      timeout: 10000
    });
    
    // Blog post'u açılmış mı kontrol et
    await page.waitForSelector('#modal-content', { timeout: 5000 }).catch(() => {});
    
    // Render edilmiş HTML'i al
    const html = await page.content();
    
    await browser.close();
    
    // Render edilmiş HTML döndür
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
    
  } catch (error) {
    console.error('Prerender error:', error);
    // Hata durumunda normal index.html döndür
    res.redirect('/index.html');
  }
}

function detectBot(userAgent) {
  const botPattern = /(googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot)/i;
  return botPattern.test(userAgent) || userAgent.includes('Google-InspectionTool');
}