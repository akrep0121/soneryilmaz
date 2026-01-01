const { initializeApp } = require('firebase/app');
const { getAuth, signInAnonymously } = require('firebase/auth');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDtN5CJ4fvWMCkGImJEMfKQrIiBdeKZKqI",
  authDomain: "portfolyo-145a9.firebaseapp.com",
  projectId: "portfolyo-145a9",
  storageBucket: "portfolyo-145a9.firebasestorage.app",
  messagingSenderId: "230588990982",
  appId: "1:230588990982:web:d7fbb79d94bb4cc9b22587"
};

export default async function handler(req, res) {
  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const appId = "portfolyo-145a9";
    
    // Anonymous auth ile bağlan
    await signInAnonymously(auth);
    
    // Blog post'larını çek
    const postsRef = collection(db, 'artifacts', appId, 'public', 'data', 'blogPosts');
    const querySnapshot = await getDocs(postsRef);
    
    const posts = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      posts.push({
        slug: data.slug,
        updatedAt: data.updatedAt || data.createdAt
      });
    });
    
    // Sitemap XML oluştur
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://soneryilmaz.vercel.app/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${posts.map(post => {
    const lastmod = post.updatedAt ? 
      new Date(post.updatedAt.seconds * 1000).toISOString() : 
      new Date().toISOString();
    return `  <url>
    <loc>https://soneryilmaz.vercel.app/blog/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }).join('\n')}
</urlset>`;
    
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(sitemap);
    
  } catch (error) {
    console.error('Sitemap error:', error);
    // Hata durumunda basit bir sitemap döndür
    const simpleSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://soneryilmaz.vercel.app/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
    
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(simpleSitemap);
  }
}