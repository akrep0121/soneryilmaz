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
  const url = req.url;
  
  // Bot detection
  const isBot = detectBot(req.headers['user-agent']);
  
  if (!isBot) {
    // Normal kullanıcı - 404 döndür (SPA bunu handle edecek)
    return res.status(404).send('Not Found');
  }
  
  try {
    // Blog slug'ını çıkar
    const slugMatch = url.match(/\/blog\/([^\/\?]+)/);
    const slug = slugMatch ? slugMatch[1] : null;
    
    let blogPost = null;
    
    // Eğer blog URL'si ise, Firebase'den veri çek
    if (slug) {
      blogPost = await getBlogPostBySlug(slug);
      
      if (!blogPost) {
        console.log(`Blog post not found for slug: ${slug}`);
        return res.status(404).send('Blog post not found');
      }
    }
    
    // index.html'i diskten oku
    const htmlPath = path.join(process.cwd(), 'index.html');
    const indexHtml = fs.readFileSync(htmlPath, 'utf-8');
    
    // Blog post varsa, HTML'i güncelle
    let finalHtml = indexHtml;
    
    if (blogPost) {
      // İçerik özetini oluştur
      const cleanContent = blogPost.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const summary = cleanContent.substring(0, 160) + "...";
      const newTitle = `${blogPost.title} | Soner Yılmaz`;
      const postUrl = `https://soneryilmaz.vercel.app/blog/${blogPost.slug}`;
      
      // Meta tag'leri güncelle
      finalHtml = finalHtml
        .replace(/<title[^>]*>.*?<\/title>/i, `<title>${newTitle}</title>`)
        .replace(/<meta\s+name="description"\s+id="site-description"\s+content="[^"]*"[^>]*>/i, 
                `<meta name="description" id="site-description" content="${summary}">`)
        .replace(/<meta\s+name="keywords"\s+id="site-keywords"\s+content="[^"]*"[^>]*>/i, 
                `<meta name="keywords" id="site-keywords" content="${blogPost.category}, ${blogPost.title}, Soner Yılmaz">`)
        .replace(/<meta\s+property="og:title"\s+id="og-title"\s+content="[^"]*"[^>]*>/i, 
                `<meta property="og:title" id="og-title" content="${newTitle}">`)
        .replace(/<meta\s+property="og:description"\s+id="og-description"\s+content="[^"]*"[^>]*>/i, 
                `<meta property="og:description" id="og-description" content="${summary}">`)
        .replace(/<meta\s+property="og:url"\s+id="og-url"\s+content="[^"]*"[^>]*>/i, 
                `<meta property="og:url" id="og-url" content="${postUrl}">`)
        .replace(/<meta\s+property="og:image"\s+id="og-image"\s+content="[^"]*"[^>]*>/i, 
                `<meta property="og:image" id="og-image" content="${blogPost.imageUrl}">`)
        .replace(/<meta\s+property="og:type"\s+id="og-type"\s+content="[^"]*"[^>]*>/i, 
                `<meta property="og:type" id="og-type" content="article">`)
        .replace(/<meta\s+name="twitter:title"\s+id="twitter-title"\s+content="[^"]*"[^>]*>/i, 
                `<meta name="twitter:title" id="twitter-title" content="${newTitle}">`)
        .replace(/<meta\s+name="twitter:description"\s+id="twitter-description"\s+content="[^"]*"[^>]*>/i, 
                `<meta name="twitter:description" id="twitter-description" content="${summary}">`)
        .replace(/<meta\s+name="twitter:image"\s+id="twitter-image"\s+content="[^"]*"[^>]*>/i, 
                `<meta name="twitter:image" id="twitter-image" content="${blogPost.imageUrl}">`)
        .replace(/<link\s+id="site-canonical"\s+rel="canonical"\s+href="[^"]*"[^>]*>/i, 
                `<link id="site-canonical" rel="canonical" href="${postUrl}">`);
      
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
        /<script\s+type="application\/ld\+json"\s+id="structured-data-ld"><\/script>/i,
        `<script type="application/ld+json" id="structured-data-ld">${JSON.stringify(schemaData)}</script>`
      );
      
      // Reader modal'ı için otomatik açma script'i ekle
      const autoOpenScript = `
        <script>
          window.autoOpenPostId = '${blogPost.id}';
          window.autoOpenPostData = ${JSON.stringify(blogPost).replace(/</g, '\\x3c').replace(/>/g, '\\x3e')};
        </script>
      </head>`;
      
      finalHtml = finalHtml.replace('</head>', autoOpenScript);
    }
    
    // Browser'ı başlat
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
    
    // Ek bekleme süresi - JS tam çalışsın diye
    await page.waitForTimeout(1000);
    
    // Blog post varsa, modal'ı aç
    if (blogPost) {
      await page.evaluate((postId) => {
        // Modal'ı aç ve içeriği doldur
        const modal = document.getElementById('reader-modal');
        if (modal) {
          modal.classList.remove('hidden-modal');
          modal.style.display = 'flex';
        }
        
        // Modal içeriğini güncelle
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
    }
    
    // Render edilmiş HTML'i al
    const html = await page.content();
    
    await browser.close();
    
    // Render edilmiş HTML döndür
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
    
  } catch (error) {
    console.error('Prerender error:', error);
    // Hata durumunda 404 döndür
    res.status(404).send('Blog post not found');
  }
}

async function getBlogPostBySlug(slug) {
  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const appId = "portfolyo-145a9";
    
    // Anonymous auth ile bağlan
    await signInAnonymously(auth);
    
    // Blog post'unu slug ile çek
    const postsRef = collection(db, 'artifacts', appId, 'public', 'data', 'blogPosts');
    const q = query(postsRef, where('slug', '==', slug));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Firebase error:', error);
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
