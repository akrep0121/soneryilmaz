const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getAuth, signInAnonymously } = require('firebase/auth');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDtN5CJ4fvWMCkGImJEMfKQrIiBdeKZKqI",
  authDomain: "portfolyo-145a9.firebaseapp.com",
  projectId: "portfolyo-145a9",
  storageBucket: "portfolyo-145a9.firebasestorage.app",
  messagingSenderId: "230588990982",
  appId: "1:230588990982:web:d7fbb79d94bb4cc9b22587"
};

export default async function handler(req, res) {
  const startTime = Date.now();
  
  // Tüm request bilgilerini log'la
  console.log('='.repeat(60));
  console.log('PRERENDER REQUEST');
  console.log('='.repeat(60));
  console.log('req.url:', req.url);
  console.log('req.method:', req.method);
  console.log('User-Agent:', req.headers['user-agent']);
  console.log('X-Vercel-Original-URI:', req.headers['x-vercel-original-uri']);
  console.log('Referer:', req.headers['referer']);
  console.log('Host:', req.headers['host']);
  
  // Vercel'de rewrite yapıldığında, orijinal URL birkaç yerde olabilir
  const originalUrl = req.headers['x-vercel-original-uri'] || req.headers['referer'] || req.url;
  
  // Bot detection
  const isBot = detectBot(req.headers['user-agent']);
  console.log('Bot detected:', isBot);
  
  // Bot değilse 404 dön
  if (!isBot) {
    console.log('❌ Not a bot - returning 404');
    console.log('='.repeat(60));
    return res.status(404).json({ error: 'Not Found', message: 'This endpoint is only for bots' });
  }
  
  console.log('✅ Bot detected - processing...');
  
  try {
    // Blog slug'ını çıkar
    const slugMatch = originalUrl.match(/\/blog\/([^\/\?]+)/);
    const slug = slugMatch ? slugMatch[1] : null;
    
    console.log('Extracted slug:', slug);
    console.log('Original URL used:', originalUrl);
    
    if (!slug) {
      console.log('❌ No slug found');
      console.log('='.repeat(60));
      return res.status(404).json({ error: 'No slug found', url: originalUrl });
    }
    
    // Blog post'unu Firebase'ten çek
    console.log('Fetching from Firebase...');
    const blogPost = await getBlogPostBySlug(slug);
    
    if (!blogPost) {
      console.log('❌ Blog post not found');
      console.log('='.repeat(60));
      return res.status(404).json({ error: 'Blog post not found', slug });
    }
    
    console.log('✅ Blog post found:', blogPost.title);
    
    // index.html'i diskten oku
    const htmlPath = path.join(process.cwd(), 'index.html');
    const indexHtml = fs.readFileSync(htmlPath, 'utf-8');
    console.log('✅ index.html loaded');
    
    // İçerik özetini oluştur
    const cleanContent = blogPost.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const summary = cleanContent.substring(0, 160) + "...";
    const newTitle = `${blogPost.title} | Soner Yılmaz`;
    const postUrl = `https://soneryilmaz.vercel.app/blog/${blogPost.slug}`;
    
    console.log('Updating meta tags...');
    console.log('  Title:', newTitle);
    console.log('  Summary:', summary.substring(0, 50) + '...');
    
    let finalHtml = indexHtml;
    
    // Meta tag'leri güncelle
    finalHtml = finalHtml
      .replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(newTitle)}</title>`)
      .replace(/name="description"[^>]*content="[^"]*"[^>]*>/i, 
              `name="description" id="site-description" content="${escapeHtml(summary)}"`)
      .replace(/name="keywords"[^>]*content="[^"]*"[^>]*>/i, 
              `name="keywords" id="site-keywords" content="${escapeHtml(blogPost.category)}, ${escapeHtml(blogPost.title)}, Soner Yılmaz"`)
      .replace(/property="og:title"[^>]*content="[^"]*"[^>]*>/i, 
              `property="og:title" id="og-title" content="${escapeHtml(newTitle)}"`)
      .replace(/property="og:description"[^>]*content="[^"]*"[^>]*>/i, 
              `property="og:description" id="og-description" content="${escapeHtml(summary)}"`)
      .replace(/property="og:url"[^>]*content="[^"]*"[^>]*>/i, 
              `property="og:url" id="og-url" content="${escapeHtml(postUrl)}"`)
      .replace(/property="og:image"[^>]*content="[^"]*"[^>]*>/i, 
              `property="og:image" id="og-image" content="${escapeHtml(blogPost.imageUrl)}"`)
      .replace(/property="og:type"[^>]*content="[^"]*"[^>]*>/i, 
              `property="og:type" id="og-type" content="article"`)
      .replace(/name="twitter:title"[^>]*content="[^"]*"[^>]*>/i, 
              `name="twitter:title" id="twitter-title" content="${escapeHtml(newTitle)}"`)
      .replace(/name="twitter:description"[^>]*content="[^"]*"[^>]*>/i, 
              `name="twitter:description" id="twitter-description" content="${escapeHtml(summary)}"`)
      .replace(/name="twitter:image"[^>]*content="[^"]*"[^>]*>/i, 
              `name="twitter:image" id="twitter-image" content="${escapeHtml(blogPost.imageUrl)}"`)
      .replace(/rel="canonical"[^>]*href="[^"]*"[^>]*>/i, 
              `rel="canonical" id="site-canonical" href="${escapeHtml(postUrl)}"`);
    
    // JSON-LD Structured Data güncelle
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": blogPost.title,
      "description": summary,
      "image": blogPost.imageUrl,
      "author": { "@type": "Person", "name": "Soner Yılmaz", "jobTitle": "FinTech Geliştiricisi & Yatırım Analisti" },
      "datePublished": blogPost.createdAt ? new Date(blogPost.createdAt.seconds * 1000).toISOString() : new Date().toISOString(),
      "url": postUrl,
      "publisher": {
        "@type": "Organization",
        "name": "Soner Yılmaz",
        "logo": {
          "@type": "ImageObject",
          "url": blogPost.imageUrl
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": postUrl
      }
    };
    
    finalHtml = finalHtml.replace(
      /<script type="application\/ld\+json" id="structured-data-ld"><\/script>/i,
      `<script type="application/ld+json" id="structured-data-ld">${JSON.stringify(schemaData)}</script>`
    );
    
    // Reader modal'ı için otomatik açma script'i ekle
    const autoOpenScript = `
        <script>
          window.autoOpenPostId = '${blogPost.id}';
          window.autoOpenPostData = ${JSON.stringify(blogPost).replace(/</g, '\\x3c').replace(/>/g, '\\x3e').replace(/"/g, '&quot;')};
        </script>
      </head>`;
    
    finalHtml = finalHtml.replace('</head>', autoOpenScript);
    
    // Browser'ı başlat
    console.log('Starting browser...');
    const browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    
    const page = await browser.newPage();
    
    // Set custom content
    await page.setContent(finalHtml, {
      waitUntil: 'networkidle0',
      timeout: 15000
    });
    
    console.log('✅ HTML set, waiting...');
    await page.waitForTimeout(1000);
    
    // Modal'ı aç
    console.log('Opening modal...');
    await page.evaluate((postId) => {
      const modal = document.getElementById('reader-modal');
      if (modal) {
        modal.classList.remove('hidden-modal');
        modal.style.display = 'flex';
      }
      
      const post = window.autoOpenPostData;
      if (post) {
        const imgEl = document.getElementById('modal-img');
        if (imgEl) imgEl.src = post.imageUrl;
        
        const titleEl = document.getElementById('modal-title');
        if (titleEl) titleEl.innerText = post.title;
        
        const contentEl = document.getElementById('modal-content');
        if (contentEl) contentEl.innerHTML = post.content;
        
        const categoryEl = document.getElementById('modal-category');
        if (categoryEl) {
          categoryEl.innerText = post.category;
        }
      }
    }, blogPost.id);
    
    await page.waitForTimeout(500);
    console.log('✅ Modal opened');
    
    // Render edilmiş HTML'i al
    const html = await page.content();
    
    await browser.close();
    console.log('✅ Browser closed');
    
    const duration = Date.now() - startTime;
    console.log(`✅ Total duration: ${duration}ms`);
    console.log('='.repeat(60));
    
    // Render edilmiş HTML döndür
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ ERROR');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('Duration:', duration + 'ms');
    console.error('='.repeat(60));
    
    res.status(500).json({ 
      error: 'Prerender error', 
      message: error.message,
      stack: error.stack
    });
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function getBlogPostBySlug(slug) {
  try {
    console.log('  Connecting to Firebase...');
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const appId = "portfolyo-145a9";
    
    console.log('  Signing in...');
    await signInAnonymously(auth);
    
    console.log('  Querying...');
    const postsRef = collection(db, 'artifacts', appId, 'public', 'data', 'blogPosts');
    const q = query(postsRef, where('slug', '==', slug));
    const querySnapshot = await getDocs(q);
    
    console.log('  Query done. Found:', querySnapshot.size, 'posts');
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('  ❌ Firebase error:', error.message);
    return null;
  }
}

function detectBot(userAgent) {
  if (!userAgent) return false;
  const botPattern = /(googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|ia_archiver|applebot|semrushbot|ahrefsbot|dotbot|mj12bot)/i;
  return botPattern.test(userAgent) || 
         userAgent.includes('Google-InspectionTool') ||
         userAgent.includes('Googlebot-Image') ||
         userAgent.includes('Mediapartners-Google') ||
         userAgent.includes('AdsBot-Google');
}
