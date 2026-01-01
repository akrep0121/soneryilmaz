'use client';
import { useEffect, useState, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, onSnapshot, query, where } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  imageUrl: string;
  slug?: string;
  createdAt?: any;
  views?: number;
}
interface Comment {
  id: string;
  postId: string;
  author: string;
  text: string;
  createdAt?: any;
}
interface Subscriber {
  id: string;
  email: string;
  createdAt?: any;
}
interface SiteData {
  name?: string;
  role?: string;
  profileImage?: string;
  aboutText?: string;
  heroTitle?: string;
}
export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [siteData, setSiteData] = useState<SiteData>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [currentCategory, setCurrentCategory] = useState('all');
  const [currentSort, setCurrentSort] = useState('newest');
  const [displayedPosts, setDisplayedPosts] = useState(9);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  
  const blogGridRef = useRef(null);
  const featuredPostRef = useRef(null);
  
  useEffect(() => {
    const firebaseConfig = {
      apiKey: "AIzaSyDtN5CJ4fvWMCkGImJEMfKQrIiBdeKZKqI",
      authDomain: "portfolyo-145a9.firebaseapp.com",
      projectId: "portfolyo-145a9",
      storageBucket: "portfolyo-145a9.firebasestorage.app",
      messagingSenderId: "230588990982",
      appId: "1:230588990982:web:d7fbb79d94bb4cc9b22587",
      measurementId: "G-TKWT71JERB"
    };
    
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const appId = "portfolyo-145a9";
    
    signInAnonymously(auth);
    
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const postsSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'blogPosts'));
        const postsData = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPosts(postsData);
        
        const settingsSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'siteSettings', 'config'));
        if (settingsSnap.exists()) {
          setSiteData(settingsSnap.data());
        }
        
        const commentsSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'comments'));
        setComments(commentsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        const subsSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'subscribers'));
        setSubscribers(subsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    });
  }, []);

  const createSlug = (title) => {
    const trMap = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
    return title.split('').map(c => trMap[c] || c).join('').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
  };

  const getCategoryColor = (category) => {
    const colors = {
      'fintech': 'bg-indigo-500 border-indigo-400 text-indigo-100',
      'borsa': 'bg-blue-500 border-blue-400 text-blue-100',
      'yatırım': 'bg-emerald-500 border-emerald-400 text-emerald-100',
      'teknoloji': 'bg-purple-500 border-purple-400 text-purple-100',
      'halka arz': 'bg-orange-500 border-orange-400 text-orange-100',
      'genel': 'bg-gray-500 border-gray-400 text-gray-100'
    };
    return colors[category.toLowerCase()] || 'bg-gray-500 border-gray-400 text-gray-100';
  };

  const calculateReadingTime = (content) => {
    const cleanText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = cleanText.split(' ').length;
    return Math.ceil(wordCount / 200) < 1 ? '1' : Math.ceil(wordCount / 200).toString();
  };

  const getExcerpt = (content, maxLength = 120) => {
    const cleanText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return cleanText.length > maxLength ? cleanText.substring(0, maxLength) + '...' : cleanText;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getFilteredAndSortedPosts = () => {
    let filtered = [...posts];
    
    if (currentCategory !== 'all') {
      filtered = filtered.filter(p => p.category.toLowerCase() === currentCategory.toLowerCase());
    }
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.content && p.content.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    switch (currentSort) {
      case 'popular':
        filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'comments':
        const commentCounts = {};
        comments.forEach(c => {
          commentCounts[c.postId] = (commentCounts[c.postId] || 0) + 1;
        });
        filtered.sort((a, b) => (commentCounts[b.id] || 0) - (commentCounts[a.id] || 0));
        break;
      default:
        filtered.sort((a, b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
    }
    
    return filtered;
  };

  const openReader = (id) => {
    setSelectedPostId(id);
    const slug = posts.find(p => p.id === id)?.slug || createSlug(posts.find(p => p.id === id)?.title);
    try {
      window.history.pushState({ postId: id }, '', `/blog/${slug}`);
    } catch (e) {
      console.error('URL change error:', e);
    }
  };

  const closeModal = (id) => {
    if (id === 'reader-modal') {
      setSelectedPostId(null);
      window.history.pushState({}, '', '/');
    }
  };

  const filteredPosts = getFilteredAndSortedPosts();
  const featuredPost = posts.length > 0 ? posts[0] : null;
  const categories = [...new Set(posts.map(p => p.category))];

  return (
    <div className="min-h-screen bg-black text-[#ededed]">
      <div id="scroll-progress" className="fixed top-0 left-0 h-0.5 bg-indigo-500 z-[100] transition-all duration-100" style={{width: '0%'}}></div>
      
      <nav className="fixed w-full z-50 p-8 flex justify-center">
        <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/[0.08] px-12 py-4 rounded-full shadow-2xl flex items-center gap-16 transition-all hover:border-white/[0.12]">
          <div className="text-2xl font-black tracking-tighter text-white uppercase italic select-none">
            Soner<span className="text-indigo-500">.</span>
          </div>
          <div className="hidden md:flex gap-12 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
            <a href="#home" className="hover:text-white transition">Giriş</a>
            <a href="#blog-section" className="hover:text-white transition">Yazılar</a>
            <a href="#about-section" className="hover:text-white transition">Hakkımda</a>
            <a href="#contact-section" className="hover:text-white transition">İletişim</a>
          </div>
        </div>
      </nav>

      <section id="home" className="pt-80 pb-40 px-6 max-w-6xl mx-auto text-center relative z-10">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-500/5 blur-[150px] rounded-full opacity-50 animate-pulse"></div>
        </div>
        <div className="mb-20 relative inline-block group text-center">
          <div className="absolute inset-0 bg-white/10 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition duration-1000"></div>
          <img 
            id="site-profile-img"
            src={siteData.profileImage || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"} 
            className="w-44 h-44 rounded-full object-cover grayscale border border-white/10 shadow-2xl group-hover:grayscale-0 mx-auto"
            onLoad={(e) => e.target.classList.add('loaded')}
            style={{transition: 'opacity 0.8s ease-in-out', opacity: 0}}
          />
        </div>
        <div className="flex flex-col items-center">
          <div className="inline-flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] px-8 py-2.5 rounded-full text-[10px] font-black tracking-[0.4em] text-indigo-400 uppercase mb-12">
            <span>{siteData.role || "FinTech Geliştiricisi & Yatırım Analisti"}</span>
          </div>
          <h1 id="site-hero-title" className="text-7xl md:text-[11rem] font-black tracking-tighter leading-[0.8] mb-24 text-white uppercase text-center">
            Geleceği <span className="text-indigo-500">bugünden</span> inşa edin.
          </h1>
          <button 
            onClick={() => document.getElementById('blog-section').scrollIntoView({behavior: 'smooth'})}
            className="px-8 py-4 bg-white text-black rounded-full font-bold transition-all text-sm uppercase tracking-widest hover:bg-gray-200"
          >
            İçerikleri Keşfet
          </button>
        </div>
      </section>

      <section id="blog-section" className="py-60 px-6 max-w-[1600px] mx-auto border-t border-white/[0.05]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12">
          <div className="lg:col-span-3">
            <div className="mb-16">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                <div>
                  <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-white uppercase mb-3">
                    Güncel <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Yazılar</span>
                  </h2>
                  <p className="text-gray-500 text-sm font-medium tracking-widest">
                    Toplam <span className="text-indigo-400">{posts.length}</span> içerik
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                  <select 
                    value={currentSort}
                    onChange={(e) => setCurrentSort(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest text-white outline-none focus:border-indigo-500 cursor-pointer hover:bg-white/[0.08] transition"
                  >
                    <option value="newest">En Yeni</option>
                    <option value="popular">En Popüler</option>
                    <option value="comments">En Çok Yorum</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mb-10">
                <button 
                  onClick={() => setCurrentCategory('all')}
                  className={`category-chip px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${
                    currentCategory === 'all' 
                      ? 'bg-indigo-500 text-white border-indigo-400' 
                      : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Tümü
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCurrentCategory(cat.toLowerCase())}
                    className={`category-chip px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${
                      currentCategory === cat.toLowerCase() 
                        ? 'bg-indigo-500 text-white border-indigo-400' 
                        : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="w-full relative border border-white/10 bg-white/[0.01] rounded-2xl p-2 transition-all mb-12 focus-within:border-indigo-500 focus-within:bg-white/[0.03]">
                <svg className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input 
                  type="text" 
                  placeholder="İçeriklerde ara (başlık, kategori, etiket)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent pl-12 pr-4 py-3 outline-none text-sm text-white placeholder-gray-600 font-medium"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4 cursor-pointer hover:text-white transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                )}
              </div>

              {featuredPost && (
                <div className="mb-16">
                  <div 
                    onClick={() => openReader(featuredPost.id)}
                    className="group cursor-pointer relative rounded-[3rem] overflow-hidden h-[500px] md:h-[600px]"
                  >
                    <img 
                      src={featuredPost.imageUrl} 
                      alt={featuredPost.title}
                      className="w-full h-full object-cover transition-transform duration-700 grayscale group-hover:grayscale-0 scale-105 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    <div className="absolute inset-0 flex items-end p-8 md:p-16">
                      <div className="max-w-3xl">
                        <div className="flex flex-wrap items-center gap-4 mb-6">
                          <span className={`${getCategoryColor(featuredPost.category).split(' ')[0]} px-6 py-2 rounded-full text-[10px] font-black uppercase border tracking-[0.3em] backdrop-blur-sm ${getCategoryColor(featuredPost.category).split(' ').slice(1).join(' ')}`}>
                            {featuredPost.category}
                          </span>
                          <span className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                            <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            {calculateReadingTime(featuredPost.content)}dk okuma
                          </span>
                          <span className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white">
                            {formatDate(featuredPost.createdAt)}
                          </span>
                        </div>
                        <h2 className="text-3xl md:text-5xl lg:text-6xl font-black leading-tight text-white uppercase mb-6 group-hover:text-indigo-400 transition-colors">
                          {featuredPost.title}
                        </h2>
                        <p className="text-gray-300 text-lg md:text-xl line-clamp-3 mb-8">
                          {getExcerpt(featuredPost.content, 200)}
                        </p>
                        <button className="bg-white text-black px-8 py-4 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all duration-300 flex items-center gap-2">
                          <span>Devamını Oku</span>
                          <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPosts.slice(1, displayedPosts + 1).map((post, index) => {
                  const categoryClass = getCategoryColor(post.category);
                  const readingTime = calculateReadingTime(post.content);
                  const excerpt = getExcerpt(post.content, 100);
                  const commentCount = comments.filter(c => c.postId === post.id).length;
                  
                  return (
                    <div 
                      key={post.id}
                      onClick={() => openReader(post.id)}
                      className="blog-card group cursor-pointer bg-white/[0.01] border border-white/[0.05] rounded-[2rem] overflow-hidden transition-all duration-500 hover:border-indigo-500/30"
                      style={{animationDelay: `${index * 0.1}s`}}
                    >
                      <div className="aspect-[4/3] overflow-hidden relative">
                        <img 
                          src={post.imageUrl} 
                          alt={post.title}
                          className="card-img w-full h-full object-cover transition-transform duration-700 grayscale group-hover:grayscale-0" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                        <div className="absolute top-4 left-4">
                          <span className={`${categoryClass.split(' ')[0]} px-4 py-1.5 rounded-full text-[9px] font-black uppercase border tracking-[0.2em] backdrop-blur-sm ${categoryClass.split(' ').slice(1).join(' ')}`}>
                            {post.category}
                          </span>
                        </div>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                          <span className="flex items-center gap-1.5">
                            <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            {readingTime}dk
                          </span>
                          <span className="flex items-center gap-1.5">
                            <svg className="w-3 h-3 text-indigo-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            {commentCount}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold leading-tight group-hover:text-indigo-400 transition-colors text-white uppercase">
                          {post.title}
                        </h3>
                        <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">{excerpt}</p>
                        <div className="flex items-center justify-between pt-4 border-t border-white/[0.05]">
                          <span className="text-[10px] font-medium text-gray-500">{formatDate(post.createdAt)}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                            Oku <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredPosts.length > displayedPosts + 1 && (
                <div className="text-center mt-12">
                  <button 
                    onClick={() => setDisplayedPosts(prev => prev + 6)}
                    className="bg-white/5 border border-white/10 text-white px-12 py-4 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-white/10 hover:border-indigo-500 transition-all duration-300 flex items-center gap-2 mx-auto"
                  >
                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    Daha Fazla Göster
                  </button>
                </div>
              )}

              {filteredPosts.length === 0 && (
                <div className="col-span-full text-center py-20">
                  <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M9 9l4 4"/><path d="m13 9-4 4"/></svg>
                  <p className="text-gray-500 text-lg">Sonuç bulunamadı.</p>
                  <button 
                    onClick={() => setCurrentCategory('all')}
                    className="mt-4 text-indigo-400 hover:text-indigo-300 font-bold text-sm uppercase tracking-widest"
                  >
                    Tüm Yazıları Göster
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white/[0.02] border border-white/[0.05] p-8 rounded-[2.5rem] sticky top-32 space-y-8">
              <div className="space-y-6">
                <h3 className="text-lg font-black uppercase tracking-widest text-white flex items-center gap-3">
                  <svg className="w-5 h-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                  Popüler
                </h3>
                <div className="space-y-4">
                  {posts.slice(0, 4).map((p, i) => (
                    <div 
                      key={p.id}
                      onClick={() => openReader(p.id)}
                      className="group cursor-pointer p-4 rounded-xl transition-all duration-300 hover:bg-white/[0.03] hover:border-indigo-500/30 border border-transparent"
                    >
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <span className="text-2xl font-black text-gray-700 group-hover:text-indigo-400 transition">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-white uppercase line-clamp-2 group-hover:text-indigo-400 transition">
                            {p.title}
                          </h4>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                            <span className="font-medium">{calculateReadingTime(p.content)}dk</span>
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                              {comments.filter(c => c.postId === p.id).length}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/[0.05] pt-8 space-y-6">
                <h3 className="text-lg font-black uppercase tracking-widest text-white flex items-center gap-3">
                  <svg className="w-5 h-5 text-purple-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  Kategoriler
                </h3>
                <div className="space-y-3">
                  {categories.map(cat => {
                    const count = posts.filter(p => p.category === cat).length;
                    const isActive = currentCategory === cat.toLowerCase();
                    return (
                      <button
                        key={cat}
                        onClick={() => setCurrentCategory(cat.toLowerCase())}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                          isActive 
                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' 
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        <span className="text-xs font-black uppercase tracking-wider">{cat}</span>
                        <span className="text-xs font-bold">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about-section" className="py-60 px-6 bg-white/[0.01] border-y border-white/[0.05] relative text-center">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-6xl md:text-8xl font-black tracking-tighter text-white uppercase mb-20">Motivasyon</h2>
          <p className="text-3xl md:text-5xl text-gray-400 leading-[1.4] font-medium italic opacity-80 tracking-tight">
            "{siteData.aboutText || "Modern web dünyasında vizyoner işler üretiyorum."}"
          </p>
        </div>
      </section>

      <section id="contact-section" className="py-60 px-6 max-w-4xl mx-auto text-center border-t border-white/[0.05]">
        <h2 className="text-7xl font-black tracking-tighter text-white uppercase mb-20">
          BANA <span className="text-indigo-500">ULAŞIN</span>
        </h2>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <input 
            name="name" 
            required 
            placeholder="İSİM" 
            className="w-full bg-transparent border-b border-white/10 py-6 outline-none focus:border-indigo-500 text-xl font-bold uppercase transition" 
          />
          <input 
            name="email" 
            type="email" 
            required 
            placeholder="E-POSTA" 
            className="w-full bg-transparent border-b border-white/10 py-6 outline-none focus:border-indigo-500 text-xl font-bold uppercase transition" 
          />
          <textarea 
            name="message" 
            required 
            placeholder="MESAJINIZ" 
            className="md:col-span-2 w-full bg-transparent border-b border-white/10 py-6 outline-none focus:border-indigo-500 text-xl font-bold uppercase transition resize-none" 
            rows="4"
          />
          <div className="md:col-span-2 flex justify-center pt-12">
            <button 
              type="submit" 
              className="px-20 py-6 bg-white text-black rounded-full font-bold transition-all text-lg uppercase tracking-widest hover:bg-gray-200"
            >
              Mesaj Gönder
            </button>
          </div>
        </form>
      </section>

      <footer className="py-40 px-6 border-t border-white/[0.05] bg-[#000]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="text-[10px] font-black tracking-[0.5em] uppercase text-gray-600 flex items-center gap-4">
            <span>{siteData.name || "Soner Yılmaz"}</span> &copy; 2025
          </div>
          <div className="flex gap-16 text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">
            <a href="https://x.com/soner_yilmz" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition">
              Twitter / @soner_yilmz
            </a>
          </div>
        </div>
      </footer>

      {selectedPostId && (
        <div className="fixed inset-0 z-[100] bg-black backdrop-blur-3xl flex items-center justify-center p-0 md:p-12 transition-opacity duration-500">
          <div className="bg-[#050505] w-full max-w-7xl h-full md:max-h-[95vh] md:rounded-[4rem] border border-white/10 flex flex-col md:flex-row overflow-hidden shadow-2xl relative">
            <div className="absolute top-10 left-10 z-50 flex gap-4">
              <button 
                onClick={() => closeModal('reader-modal')}
                className="p-6 bg-white/5 rounded-full hover:bg-white/10 transition text-white border border-white/10 shadow-2xl"
              >
                <svg className="w-7 h-7" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <button 
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    alert('Bağlantı kopyalandı!');
                  } catch (err) {
                    console.error('Kopyalama hatası:', err);
                  }
                }}
                className="p-6 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 transition text-indigo-400 border-indigo-500/30 rounded-full shadow-2xl hover:shadow-indigo-500/50"
                title="Bağlantıyı Kopyala"
              >
                <svg className="w-8 h-8" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              </button>
            </div>
            {(() => {
              const p = posts.find(x => x.id === selectedPostId);
              if (!p) return null;
              const categoryClass = getCategoryColor(p.category);
              return (
                <>
                  <div className="md:w-1/2 h-[50vh] md:h-auto relative shrink-0">
                    <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#050505] via-transparent to-transparent"></div>
                    <div className="absolute bottom-16 left-16 right-16">
                      <span className={`${categoryClass.split(' ')[0]} px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 inline-block text-white shadow-xl ${categoryClass.split(' ').slice(1).join(' ')}`}>
                        {p.category}
                      </span>
                      <h2 className="text-6xl md:text-7xl font-black leading-[0.9] tracking-tighter text-white uppercase">
                        {p.title}
                      </h2>
                    </div>
                  </div>
                  <div className="md:w-1/2 p-8 md:p-24 overflow-y-auto bg-[#050505] custom-scrollbar">
                    <div 
                      className="prose prose-invert prose-p:text-gray-400 prose-p:text-xl prose-h2:text-white prose-h2:text-4xl"
                      dangerouslySetInnerHTML={{ __html: p.content }}
                    />
                    <div className="mt-24 p-10 bg-white/[0.02] border border-white/5 rounded-[2.5rem] text-center">
                      <h4 className="text-2xl font-black text-white uppercase mb-6">Haftalık Analizler</h4>
                      <form className="flex flex-col gap-3">
                        <input 
                          type="email" 
                          required 
                          placeholder="E-POSTA" 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 text-xs font-bold" 
                        />
                        <button 
                          type="submit"
                          className="w-full bg-white text-black py-4 rounded-2xl font-black text-[10px] uppercase"
                        >
                          Abone Ol
                        </button>
                      </form>
                    </div>
                    <div className="mt-24 pt-12 border-t border-white/5">
                      <h3 className="text-3xl font-black text-white uppercase mb-12 flex items-center gap-4">
                        Yorumlar <span className="text-indigo-500 text-sm">{comments.filter(c => c.postId === p.id).length}</span>
                      </h3>
                      <form className="space-y-4 mb-16">
                        <input 
                          name="author" 
                          required 
                          placeholder="İSMİNİZ" 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 text-xs font-bold" 
                        />
                        <textarea 
                          name="text" 
                          required 
                          placeholder="FİKRİNİZİ PAYLAŞIN..." 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 text-xs font-bold" 
                          rows="3"
                        />
                        <button 
                          type="submit"
                          className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase"
                        >
                          Gönder
                        </button>
                      </form>
                      <div className="space-y-8">
                        {comments.filter(c => c.postId === p.id).length === 0 ? (
                          <p className="text-gray-700 italic text-sm">İlk yorumu siz yapın!</p>
                        ) : (
                          comments
                            .filter(c => c.postId === p.id)
                            .sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0))
                            .map(c => (
                              <div key={c.id} className="bg-white/[0.03] p-8 rounded-[2rem]">
                                <div className="text-white font-bold text-sm uppercase mb-4">{c.author}</div>
                                <p className="text-gray-400 text-sm leading-relaxed">{c.text}</p>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <button 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        id="back-to-top"
        className="fixed bottom-8 left-8 z-[70] p-4 bg-white text-black rounded-full transition-all duration-500 shadow-2xl hover:bg-gray-200 opacity-0 pointer-events-none translate-y-5"
      >
        <svg className="w-5 h-5 mx-auto" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
      </button>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .blog-card { opacity: 0; transform: translateY(30px); animation: fadeUp 0.6s ease-out forwards; }
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <script dangerouslySetInnerHTML={{
        __html: `
          window.onscroll = () => {
            const ws = window.scrollY;
            const h = document.documentElement.scrollHeight - window.innerHeight;
            const prog = document.getElementById('scroll-progress');
            if (prog) prog.style.width = (ws / h * 100) + '%';
            const btt = document.getElementById('back-to-top');
            if (ws > 300) { 
              btt.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-5');
            } else { 
              btt.classList.add('opacity-0', 'pointer-events-none', 'translate-y-5');
            }
          };
        `
      }} />
    </div>
  );
}
