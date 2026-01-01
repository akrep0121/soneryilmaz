const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
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
    // Normal kullanıcı - index.html döndür
    return res.redirect('/');
  }
  
  try {
    // Blog slug'ını çıkar
    const slugMatch = url.match(/\/blog\/([^\/]+)/);
    const slug = slugMatch ? slugMatch[1] : null;
    
    let blogPost = null;
    
    // Eğer blog URL'si ise, Firebase'den veri çek
    if (slug) {
      blogPost = await getBlogPostBySlug(slug);
    }
    
    // Browser'ı başlat
    const browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    
    const page = await browser.newPage();
    
    // Sayfayı yükle
    await page.goto(`https://soneryilmaz.vercel.app${url}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // JavaScript ile meta tag'leri güncelle
    if (blogPost) {
      await page.evaluate((post) => {
        // Meta tag'leri güncelle
        const descEl = document.querySelector('meta[name="description"]');
        const keyEl = document.querySelector('meta[name="keywords"]');
        const ogTitle = document.querySelector('meta[property="og:title"]');
        const ogDesc = document.querySelector('meta[property="og:description"]');
        const ogImage = document.querySelector('meta[property="og:image"]');
        const canonEl = document.querySelector('link[rel="canonical"]');
        const twitterCard = document.querySelector('meta[name="twitter:card"]');
        const twitterTitle = document.querySelector('meta[name="twitter:title"]');
        const twitterDesc = document.querySelector('meta[name="twitter:description"]');
        const twitterImage = document.querySelector('meta[name="twitter:image"]');
        
        // İçerik özetini oluştur
        const cleanContent = post.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const summary = cleanContent.substring(0, 160) + "...";
        const newTitle = `${post.title} | Soner Yılmaz`;
        
        // Meta tags
        if (descEl) descEl.content = summary;
        if (keyEl) keyEl.content = `${post.category}, ${post.title}, Soner Yılmaz`;
        
        // Open Graph
        if (ogTitle) ogTitle.content = newTitle;
        if (ogDesc) ogDesc.content = summary;
        if (ogImage) ogImage.content = post.imageUrl;
        
        // Twitter Card
        if (twitterCard) twitterCard.content = 'summary_large_image';
        if (twitterTitle) twitterTitle.content = newTitle;
        if (twitterDesc) twitterDesc.content = summary;
        if (twitterImage) twitterImage.content = post.imageUrl;
        
        // Canonical URL
        if (canonEl) canonEl.href = `https://soneryilmaz.vercel.app/blog/${post.slug}`;
        
        // Page title
        document.title = newTitle;
        
        // JSON-LD Structured Data ekle/güncelle
        const jsonLdEl = document.getElementById('structured-data-ld');
        const schemaData = {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": post.title,
          "description": summary,
          "image": post.imageUrl,
          "author": { "@type": "Person", "name": "Soner Yılmaz" },
          "datePublished": post.createdAt ? new Date(post.createdAt.seconds * 1000).toISOString() : new Date().toISOString(),
          "url": `https://soneryilmaz.vercel.app/blog/${post.slug}`,
          "publisher": {
            "@type": "Organization",
            "name": "Soner Yılmaz",
            "logo": {
              "@type": "ImageObject",
              "url": post.imageUrl
            }
          }
        };
        
        if (jsonLdEl) {
          jsonLdEl.textContent = JSON.stringify(schemaData);
        } else {
          const script = document.createElement('script');
          script.type = 'application/ld+json';
          script.id = 'structured-data-ld';
          script.textContent = JSON.stringify(schemaData);
          document.head.appendChild(script);
        }
        
        // Modal içeriğini doğrudan body'ye ekle (screenshot için)
        const readerModal = document.createElement('div');
        readerModal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000; z-index: 9999;';
        readerModal.innerHTML = `
          <div style="display: flex; height: 100%; max-width: 1400px; margin: 0 auto; color: #fff;">
            <div style="flex: 1; position: relative;">
              <img src="${post.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
              <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 2rem; background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);">
                <span style="background: #4f46e5; padding: 0.5rem 1.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 900; text-transform: uppercase;">${post.category}</span>
                <h1 style="font-size: 3rem; font-weight: 900; margin-top: 1rem; line-height: 1.1;">${post.title.toUpperCase()}</h1>
              </div>
            </div>
            <div style="flex: 1; padding: 3rem; overflow-y: auto; font-family: sans-serif;">
              <div style="color: #9ca3af; line-height: 1.8; font-size: 1.125rem;">
                ${post.content}
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(readerModal);
        
      }, blogPost);
    }
    
    // Ek bekleme süresi - JS tam çalışsın diye
    await page.waitForTimeout(2000);
    
    // Render edilmiş HTML'i al
    const html = await page.content();
    
    await browser.close();
    
    // Render edilmiş HTML döndür
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
    
  } catch (error) {
    console.error('Prerender error:', error);
    // Hata durumunda normal index.html döndür
    res.redirect('/');
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