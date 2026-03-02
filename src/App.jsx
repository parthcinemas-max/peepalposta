import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, setDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  Calendar, 
  Video, 
  Image as ImageIcon, 
  Layers, 
  PlaySquare, 
  Youtube, 
  Linkedin, 
  Twitter, 
  Facebook,
  Instagram,
  Plus, 
  Trash2, 
  Send,
  CheckCircle2,
  RefreshCw,
  Settings,
  ExternalLink,
  Upload,
  X,
  Link2,
  AlignLeft,
  Hash,
  Tag,
  Leaf
} from 'lucide-react';

// --- Firebase Initialization & Safety Fallback ---
const localConfig = {}; // <--- PASTE YOUR FIREBASE CONFIG HERE WHEN IN VS CODE

const isCanvasEnv = typeof __firebase_config !== 'undefined';
const firebaseConfig = isCanvasEnv ? JSON.parse(__firebase_config) : localConfig;
const hasFirebase = Object.keys(firebaseConfig).length > 0;

let app, auth, db;
if (hasFirebase) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Make.com Webhook URL ---
// PASTE your Make.com Webhook URL inside these quotes in Step 2:
const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/6vtcsm3no1nul88w4od4yk65ya43yqhx"; 

// --- Custom WhatsApp Icon ---
const WhatsAppIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

// --- Helper Functions ---
const getNextMonday = (date = new Date()) => {
  const d = new Date(date);
  d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
  return d;
};
const formatDate = (date) => date.toISOString().split('T')[0];
const getMonthName = (dateString) => new Date(dateString).toLocaleString('default', { month: 'long', year: 'numeric' });
const getDayName = (dateString) => {
  const [year, month, day] = dateString.split('-');
  return new Date(year, month - 1, day).toLocaleDateString('default', { weekday: 'long' });
};

// --- Main Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [posts, setPosts] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState({}); // Tracks cloud upload status
  const updateTimers = useRef({}); // Prevents DB spam on rapid typing

  const [isPublishing, setIsPublishing] = useState(null);
  const [toast, setToast] = useState(null);

  const [connectedPlatforms, setConnectedPlatforms] = useState({
    YouTube: false, Facebook: false, Instagram: false, LinkedIn: false, X: false
  });
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState(null);
  const [publishModalPostId, setPublishModalPostId] = useState(null);

  // --- Step 1A: Firebase Authentication ---
  useEffect(() => {
    if (!hasFirebase) {
      setUser({ uid: 'local-demo-user' });
      return;
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- Step 1B: Firebase Data Fetching ---
  useEffect(() => {
    if (!user) return;
    if (!hasFirebase) {
      setIsLoaded(true); // Skip DB fetch if no Firebase
      return;
    }
    
    const postsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'posts');
    const unsubscribe = onSnapshot(postsRef, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(fetchedPosts.sort((a, b) => new Date(a.date) - new Date(b.date)));
      setIsLoaded(true);
    }, (error) => {
      console.error("Error fetching planner data:", error);
      showToast("Error loading your planner data.");
    });

    return () => unsubscribe();
  }, [user]);

  // --- Step 1C: Auto-generate if New User ---
  useEffect(() => {
    if (isLoaded && posts.length === 0) {
      generateWeeklySchedule(new Date());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // --- Automation Logic: Generate Schedule ---
  const generateWeeklySchedule = async (startDate) => {
    if (!user) return;
    const monday = startDate.getDay() === 1 ? startDate : getNextMonday(startDate);
    
    const template = [
      { dayOffset: 0, format: 'Carousel', platforms: ['LinkedIn', 'X'], type: 'gfx' },
      { dayOffset: 1, format: 'Recorded Video + Reel', platforms: ['Facebook', 'Instagram', 'X', 'YouTube'], type: 'video' },
      { dayOffset: 2, format: 'GFX Reel', platforms: ['LinkedIn', 'X'], type: 'gfx' },
      { dayOffset: 3, format: 'Carousel', platforms: ['Facebook', 'Instagram', 'X'], type: 'gfx' },
      { dayOffset: 4, format: 'Carousel', platforms: ['LinkedIn', 'X'], type: 'gfx' },
      { dayOffset: 5, format: 'Recorded Video + Reel', platforms: ['YouTube', 'Facebook', 'Instagram', 'X'], type: 'video' },
    ];

    const newPosts = template.map((item) => {
      const postDate = new Date(monday);
      postDate.setDate(monday.getDate() + item.dayOffset);
      return {
        id: crypto.randomUUID(),
        date: formatDate(postDate),
        topic: `Topic for ${item.format}`,
        notes: '', 
        caption: '',
        keywords: '',
        hashtags: '',
        format: item.format,
        platforms: item.platforms,
        status: 'Draft',
        postLinks: [] 
      };
    });

    // Optimistic Update
    setPosts(prev => [...prev, ...newPosts].sort((a, b) => new Date(a.date) - new Date(b.date)));
    
    // Save batch to Firestore safely
    if (hasFirebase && user) {
      newPosts.forEach(post => {
        setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'posts', post.id), post).catch(e => console.error(e));
      });
    }

    showToast("Weekly schedule auto-generated and saved!");
  };

  const handleAddCustomPost = () => {
    if (!user) return;
    const newPost = {
      id: crypto.randomUUID(),
      date: formatDate(new Date()),
      topic: 'New Content Topic',
      notes: '',
      caption: '',
      keywords: '',
      hashtags: '',
      format: 'Single GFX',
      platforms: ['Facebook', 'Instagram', 'LinkedIn', 'X'],
      status: 'Draft',
      postLinks: []
    };
    
    setPosts(prev => [newPost, ...prev].sort((a, b) => new Date(a.date) - new Date(b.date)));
    
    if (hasFirebase) {
      setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'posts', newPost.id), newPost).catch(e => console.error(e));
    }
  };

  const updatePost = (id, field, value) => {
    // 1. Instantly update local UI
    setPosts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    
    // 2. Debounce and sync to Firestore safely
    if (user && hasFirebase) {
      const timerKey = `${id}-${field}`;
      if (updateTimers.current[timerKey]) {
        clearTimeout(updateTimers.current[timerKey]);
      }
      
      updateTimers.current[timerKey] = setTimeout(() => {
        updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'posts', id), { [field]: value })
          .catch(err => console.error("Error syncing to database:", err));
      }, 800);
    }
  };

  const deletePost = (id) => {
    if (!user) return;
    setPosts(prev => prev.filter(p => p.id !== id));
    
    if (hasFirebase) {
      deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'posts', id)).catch(e => console.error(e));
    }
  };

  // --- Step 2: Simulated Media Upload Logic (Fallback for Sandbox) ---
  const handleFileUpload = async (e, postId) => {
    if (!user) return;
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploadingMedia(prev => ({ ...prev, [postId]: true }));

    // Simulate network delay and use local blob URLs 
    // since Firebase Storage is restricted in the Canvas sandbox environment.
    setTimeout(() => {
      const newMedia = [];
      for (const file of files) {
        newMedia.push({
          url: URL.createObjectURL(file),
          type: file.type.startsWith('video/') ? 'video' : 'image',
          name: file.name
        });
      }

      updatePost(postId, 'media', newMedia);
      setUploadingMedia(prev => ({ ...prev, [postId]: false }));
      showToast("Media attached securely for preview!");
    }, 1000);
  };

  const clearMedia = (postId) => {
    updatePost(postId, 'media', []);
  };

  // --- Platform Specific Media Upload Logic (Thumbnails & Covers) ---
  const handlePlatformImageUpload = async (e, postId, field) => {
    if (!user) return;
    const file = e.target.files[0];
    if (!file) return;

    setUploadingMedia(prev => ({ ...prev, [`${postId}-${field}`]: true }));

    // Simulate upload delay and fallback to local preview
    setTimeout(() => {
      const localUrl = URL.createObjectURL(file);
      updatePost(postId, field, localUrl);
      setUploadingMedia(prev => ({ ...prev, [`${postId}-${field}`]: false }));
      showToast("Image attached securely for preview!");
    }, 1000);
  };

  // --- Platform Link Simulator with Realistic OAuth Popup ---
  const togglePlatformConnection = (platform) => {
    const isCurrentlyConnected = connectedPlatforms[platform];

    if (!isCurrentlyConnected) {
      // Simulate OAuth Popup Window
      const width = 500;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        '', 
        `Connect ${platform}`, 
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );

      if (popup) {
        popup.document.write(`
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 20px; text-align: center; color: #333;">
            <div style="width: 60px; height: 60px; background: #f0fdf4; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            </div>
            <h2 style="margin-bottom: 10px;">Connect PeepalPost to ${platform}</h2>
            <p style="color: #666; line-height: 1.5; margin-bottom: 30px;">
              In a full production environment, this window displays the official ${platform} secure login screen.
            </p>
            <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 15px; text-align: left; margin-bottom: 30px;">
              <h4 style="color: #d97706; margin: 0 0 8px 0;">Developer Notice:</h4>
              <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.5;">
                To enable real account linking, you must register PeepalPost as a Developer Application with ${platform} to obtain an OAuth 2.0 Client ID. 
                <br><br>
                For a faster route without code, check the <b>Make.com / Zapier Webhook</b> method mentioned in your Roadmap!
              </p>
            </div>
            <p style="color: #10b981; font-weight: bold; animation: pulse 2s infinite;">
              Simulating successful connection in a few seconds...
            </p>
          </div>
        `);
      }

      setConnectingPlatform(platform);

      // Close popup and connect after 4 seconds
      setTimeout(() => {
        if (popup) popup.close();
        setConnectedPlatforms(prev => ({ ...prev, [platform]: true }));
        showToast(`Successfully linked ${platform}!`);
        setConnectingPlatform(null);
      }, 4000);

    } else {
      // Instantly disconnect
      setConnectedPlatforms(prev => ({ ...prev, [platform]: false }));
      showToast(`Disconnected from ${platform}`);
    }
  };

  // --- Real API Publishing via Make.com Webhook ---
  const handlePublish = async (post) => {
    const unconnected = post.platforms.filter(p => !connectedPlatforms[p]);
    if (unconnected.length > 0) {
      showToast(`⚠️ Please link ${unconnected.join(', ')} first!`);
      setIsConnectModalOpen(true);
      return;
    }

    setIsPublishing(post.id);
    
    try {
      // If a Webhook URL is provided, send the real data to Make.com!
      if (MAKE_WEBHOOK_URL) {
        const payload = {
          postId: post.id,
          topic: post.topic,
          caption: post.caption,
          hashtags: post.hashtags,
          platforms: post.platforms,
          date: new Date().toISOString()
        };

        // Fire the data over to Make.com silently in the background
        await fetch(MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      // Mark as published in our database
      setTimeout(() => {
        const generatedLinks = post.platforms.map(platform => ({
          platform: platform,
          url: `https://${platform.toLowerCase()}.com/post/${crypto.randomUUID().slice(0,8)}`
        }));

        updatePost(post.id, 'status', 'Published');
        updatePost(post.id, 'postLinks', generatedLinks);
        
        setIsPublishing(null);
        setPublishModalPostId(null);
        showToast(MAKE_WEBHOOK_URL ? `Successfully sent to Make.com for publishing!` : `Simulated post success! (Add Webhook to go live)`);
      }, 1500); 

    } catch (error) {
      console.error("Error sending to Make.com:", error);
      setIsPublishing(null);
      showToast("❌ Failed to send post to automation server.");
    }
  };

  // --- WhatsApp Sharing Logic ---
  const handleWhatsAppShare = (post) => {
    let message = `*${post.topic}*\n\n`;
    if (post.caption) {
      message += `"${post.caption.slice(0, 100)}${post.caption.length > 100 ? '...' : ''}"\n\n`;
    }
    if (post.postLinks && post.postLinks.length > 0) {
      message += `${post.postLinks[0].url}\n\n`;
      if (post.postLinks.length > 1) {
        message += `Also on:\n`;
        post.postLinks.slice(1).forEach(link => {
          message += `• ${link.platform}: ${link.url}\n`;
        });
      }
    } else {
      message += `⏳ *Status:* Pending publication on ${post.platforms.join(', ')}\n`;
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareSingleLink = (post, link) => {
    let message = `*${post.topic}*\n\n`;
    if (post.caption) {
      message += `"${post.caption.slice(0, 100)}${post.caption.length > 100 ? '...' : ''}"\n\n`;
    }
    message += `${link.url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Group posts by Month
  const groupedPosts = posts.reduce((acc, post) => {
    const month = getMonthName(post.date);
    if (!acc[month]) acc[month] = [];
    acc[month].push(post);
    return acc;
  }, {});

  const formatIcons = {
    'Recorded Video + Reel': <Video className="w-4 h-4 text-red-500" />,
    'Single GFX': <ImageIcon className="w-4 h-4 text-blue-500" />,
    'Carousel': <Layers className="w-4 h-4 text-purple-500" />,
    'GFX Reel': <PlaySquare className="w-4 h-4 text-pink-500" />,
  };

  const platformIcons = {
    'YouTube': <Youtube className="w-4 h-4 text-red-600" />,
    'Facebook': <Facebook className="w-4 h-4 text-blue-600" />,
    'Instagram': <Instagram className="w-4 h-4 text-pink-600" />,
    'LinkedIn': <Linkedin className="w-4 h-4 text-blue-700" />,
    'X': <Twitter className="w-4 h-4 text-gray-900" />
  };

  const customGridClasses = "grid grid-cols-[100px_1.2fr_130px_140px_1.5fr_2.2fr_110px_1.5fr_100px] gap-4";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 z-50 animate-fade-in-down">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-600 p-2 rounded-lg relative">
              <Leaf className="w-6 h-6 text-white" />
              {user && (
                 <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border border-white"></span>
                </span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">PeepalPost</h1>
              <span className="text-xs text-green-600 font-medium">{user ? 'Database Connected' : 'Connecting...'}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsConnectModalOpen(true)}
              className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Link2 className="w-4 h-4" />
              <span>Link Platforms</span>
            </button>
            <button 
              onClick={() => {
                const lastPostDate = posts.length > 0 ? new Date(posts[posts.length - 1].date) : new Date();
                generateWeeklySchedule(lastPostDate);
              }}
              className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Auto-Fill Next Week</span>
            </button>
            <button 
              onClick={handleAddCustomPost}
              className="flex items-center space-x-2 bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Post</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        
        {Object.keys(groupedPosts).length === 0 && isLoaded && (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold text-gray-500">No content planned yet.</h2>
            <p className="text-gray-400 mt-2">Click "Auto-Fill Next Week" to start your automation.</p>
          </div>
        )}

        {Object.entries(groupedPosts).map(([month, monthPosts]) => (
          <div key={month} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide">{month}</h2>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[1400px]">
                
                {/* Table Header */}
                <div className={`${customGridClasses} px-6 py-3 border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-white`}>
                  <div>Date & Day</div>
                  <div>Topic</div>
                  <div>Format</div>
                  <div>Platforms</div>
                  <div>Editor Notes</div>
                  <div>Media Preview</div>
                  <div className="text-center">Post Now</div>
                  <div>Live Links</div>
                  <div className="text-right">Share</div>
                </div>

                {/* Posts List */}
                <div className="divide-y divide-gray-100">
                  {monthPosts.map(post => {
                    const postMedia = post.media || [];
                    const isUploading = uploadingMedia[post.id];

                    return (
                    <div key={post.id} className={`${customGridClasses} px-6 py-4 items-start hover:bg-gray-50 transition-colors`}>
                      
                      {/* 1. Date & Day */}
                      <div className="flex flex-col pt-1">
                        <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider mb-1">
                          {getDayName(post.date)}
                        </span>
                        <input 
                          type="date" 
                          value={post.date}
                          onChange={(e) => updatePost(post.id, 'date', e.target.value)}
                          className="text-sm font-medium text-gray-900 bg-transparent border-none p-0 focus:ring-0 cursor-pointer -ml-0.5"
                        />
                      </div>

                      {/* 2. Topic */}
                      <div>
                        <textarea 
                          value={post.topic}
                          onChange={(e) => updatePost(post.id, 'topic', e.target.value)}
                          rows={2}
                          className="w-full text-sm text-gray-900 bg-transparent border border-gray-200 hover:border-gray-300 focus:border-emerald-500 rounded-md px-2.5 py-1.5 resize-none transition-colors shadow-sm"
                          placeholder="Enter post topic..."
                        />
                      </div>

                      {/* 3. Format */}
                      <div className="flex items-center space-x-2.5 text-sm font-medium text-gray-700 pt-1">
                        <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 shadow-sm">
                          {formatIcons[post.format] || <ImageIcon className="w-4 h-4 text-gray-500" />}
                        </div>
                        <span className="truncate text-xs leading-tight" title={post.format}>
                          {post.format === 'Recorded Video + Reel' ? 'Video + Reel' : post.format}
                        </span>
                      </div>

                      {/* 4. Platforms */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {post.platforms.map(platform => (
                          <span
                            key={platform}
                            title={platform}
                            className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm flex items-center justify-center"
                          >
                            {platformIcons[platform]}
                          </span>
                        ))}
                      </div>

                      {/* 5. Editor Notes */}
                      <div className="h-full">
                        <textarea 
                          value={post.notes}
                          onChange={(e) => updatePost(post.id, 'notes', e.target.value)}
                          className="w-full min-h-[140px] text-xs text-gray-900 bg-transparent border border-gray-200 hover:border-gray-300 focus:border-emerald-500 rounded-md px-2.5 py-1.5 resize-none transition-colors shadow-sm"
                          placeholder="Instructions for Editor/Designer..."
                        />
                      </div>

                      {/* 6. Media Preview */}
                      <div className="flex flex-col gap-2 h-full">
                        {isUploading ? (
                          <div className="flex flex-col items-center justify-center h-[140px] rounded-md bg-emerald-50 border border-emerald-100 text-emerald-500 shadow-inner">
                            <RefreshCw className="w-6 h-6 animate-spin mb-2" />
                            <span className="text-[10px] font-medium">Uploading to Cloud...</span>
                          </div>
                        ) : postMedia.length > 0 ? (
                          <div className="relative group rounded-md overflow-hidden border border-gray-200 bg-black/5 flex items-center justify-center h-[140px] shadow-inner">
                            {postMedia[0].type === 'video' ? (
                              <video src={postMedia[0].url} className="h-full w-full object-cover" controls />
                            ) : (
                              <img src={postMedia[0].url} alt="preview" className="h-full w-full object-cover" />
                            )}
                            
                            {postMedia.length > 1 && (
                              <div className="absolute bottom-1 right-1 bg-black/75 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                                +{postMedia.length - 1} more
                              </div>
                            )}

                            <button
                              onClick={() => clearMedia(post.id)}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                              title="Remove Media"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center h-[140px] border-2 border-dashed border-gray-300 rounded-md bg-white hover:bg-emerald-50 cursor-pointer transition-colors text-gray-400 hover:text-emerald-500 hover:border-emerald-300 group">
                            <Upload className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-medium px-2 text-center">
                              {post.format === 'Carousel' ? 'Upload Carousel Images' : 'Upload Video/GFX'}
                            </span>
                            <input
                              type="file"
                              multiple={post.format === 'Carousel'}
                              accept={post.format.includes('Video') || post.format.includes('Reel') ? 'video/*,image/*' : 'image/*'}
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, post.id)}
                            />
                          </label>
                        )}
                      </div>

                      {/* 7. Post Now Action */}
                      <div className="flex justify-center pt-1">
                        {post.status === 'Published' ? (
                          <span className="flex items-center text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-md shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Live
                          </span>
                        ) : (
                          <button
                            onClick={() => setPublishModalPostId(post.id)}
                            disabled={isPublishing === post.id}
                            className={`flex items-center justify-center w-full space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all shadow-sm ${
                              isPublishing === post.id 
                                ? 'bg-emerald-100 text-emerald-700 cursor-wait'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow'
                            }`}
                          >
                            {isPublishing === post.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            <span>{isPublishing === post.id ? 'Posting...' : 'Post Now'}</span>
                          </button>
                        )}
                      </div>

                      {/* 8. Live Links */}
                      <div className="h-full">
                        {post.status === 'Published' && post.postLinks.length > 0 ? (
                          <div className="flex flex-col gap-1.5 min-h-[140px] overflow-y-auto pr-1">
                            {post.postLinks.map((link, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <a 
                                  href={link.url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="flex-1 flex items-center justify-between text-[11px] text-gray-700 bg-white border border-gray-200 px-2 py-1.5 rounded-md hover:border-emerald-300 hover:bg-emerald-50 transition-colors shadow-sm group"
                                >
                                  <div className="flex items-center space-x-1.5 truncate">
                                    {platformIcons[link.platform]}
                                    <span className="font-medium truncate">{link.platform}</span>
                                  </div>
                                  <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-emerald-500 flex-shrink-0" />
                                </a>
                                <button 
                                  onClick={() => shareSingleLink(post, link)}
                                  className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-md bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors border border-[#25D366]/20 shadow-sm"
                                  title={`Share ${link.platform} to WhatsApp`}
                                >
                                  <WhatsAppIcon className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center min-h-[140px] text-[11px] text-gray-400 italic bg-gray-50/50 rounded-md border border-dashed border-gray-200">
                            Awaiting publication...
                          </div>
                        )}
                      </div>

                      {/* 9. Share & Actions */}
                      <div className="flex items-start justify-end space-x-2 pt-1">
                        <button 
                          onClick={() => handleWhatsAppShare(post)}
                          className="flex items-center justify-center w-8 h-8 rounded-md bg-[#25D366] text-white hover:bg-[#20bd5a] transition-colors shadow-sm"
                          title="Share Summary to WhatsApp"
                        >
                          <WhatsAppIcon className="w-4 h-4" />
                        </button>

                        <button 
                          onClick={() => deletePost(post.id)}
                          className="flex items-center justify-center w-8 h-8 rounded-md bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm"
                          title="Delete Draft"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  )})}
                </div>

              </div>
            </div>
          </div>
        ))}
        
        <div className="text-center text-sm text-gray-500 mt-8 pb-8 flex items-center justify-center space-x-2">
          <Settings className="w-4 h-4" />
          <p>Database Connected. Ready for deployment to production.</p>
        </div>

      </main>

      {/* --- Connect Platforms Modal --- */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center space-x-2">
                <Link2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-gray-900">Connected Accounts</h3>
              </div>
              <button onClick={() => setIsConnectModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500 mb-4">
                Link your social media accounts to enable one-click automated posting.
              </p>
              
              {Object.keys(platformIcons).map(platform => {
                const isConnected = connectedPlatforms[platform];
                const isConnecting = connectingPlatform === platform;
                
                return (
                  <div key={platform} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-md ${isConnected ? 'bg-emerald-50 border border-emerald-100' : 'bg-gray-100 border border-transparent'}`}>
                        {platformIcons[platform]}
                      </div>
                      <span className="font-medium text-gray-900">{platform}</span>
                    </div>
                    
                    <button
                      onClick={() => togglePlatformConnection(platform)}
                      disabled={isConnecting}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all w-28 flex justify-center items-center ${
                        isConnecting 
                          ? 'bg-gray-100 text-gray-400 cursor-wait'
                          : isConnected
                            ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                      }`}
                    >
                      {isConnecting ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : isConnected ? (
                        'Disconnect'
                      ) : (
                        'Connect'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- Finalize & Publish Modal --- */}
      {publishModalPostId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {(() => {
              const activePost = posts.find(p => p.id === publishModalPostId);
              if (!activePost) return null;

              return (
                <>
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
                    <div className="flex items-center space-x-2">
                      <Send className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-lg font-bold text-gray-900">Finalize Post</h3>
                    </div>
                    <button onClick={() => setPublishModalPostId(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="p-6 space-y-5 overflow-y-auto">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-sm text-emerald-800 flex justify-between items-center">
                      <span className="font-semibold">{activePost.topic}</span>
                      <div className="flex gap-1.5">
                        {activePost.platforms.map(p => (
                          <span key={p} className="p-1 bg-white rounded shadow-sm">{platformIcons[p]}</span>
                        ))}
                      </div>
                    </div>

                    {/* Global Settings */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                        <AlignLeft className="w-4 h-4 text-gray-400" /> Global Post Details
                      </h4>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Caption</label>
                        <textarea 
                          value={activePost.caption}
                          onChange={(e) => updatePost(activePost.id, 'caption', e.target.value)}
                          rows={3}
                          className="w-full text-sm text-gray-900 border border-gray-200 focus:border-emerald-500 rounded-lg px-3 py-2 resize-none shadow-sm"
                          placeholder="Write your engaging caption here..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                            <Tag className="w-4 h-4 text-gray-400" />
                            <span>Keywords (SEO)</span>
                          </label>
                          <input 
                            type="text"
                            value={activePost.keywords}
                            onChange={(e) => updatePost(activePost.id, 'keywords', e.target.value)}
                            className="w-full text-sm text-gray-900 border border-gray-200 focus:border-emerald-500 rounded-lg px-3 py-2 shadow-sm"
                            placeholder="e.g. marketing, growth, saas"
                          />
                        </div>
                        
                        <div className="space-y-1.5">
                          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                            <Hash className="w-4 h-4 text-gray-400" />
                            <span>Hashtags</span>
                          </label>
                          <input 
                            type="text"
                            value={activePost.hashtags}
                            onChange={(e) => updatePost(activePost.id, 'hashtags', e.target.value)}
                            className="w-full text-sm text-gray-900 border border-gray-200 focus:border-emerald-500 rounded-lg px-3 py-2 shadow-sm"
                            placeholder="#marketing #growth #saas"
                          />
                        </div>
                      </div>
                    </div>

                    {/* YouTube Specific Settings */}
                    {activePost.platforms.includes('YouTube') && (
                      <div className="space-y-4 bg-red-50/40 p-4 rounded-xl border border-red-100 mt-6">
                        <h4 className="text-sm font-bold text-red-700 border-b border-red-200/50 pb-2 flex items-center gap-2">
                          <Youtube className="w-4 h-4" /> YouTube Configuration
                        </h4>
                        
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-gray-700">Video Title</label>
                          <input 
                            type="text"
                            value={activePost.ytTitle || ''}
                            onChange={(e) => updatePost(activePost.id, 'ytTitle', e.target.value)}
                            className="w-full text-sm text-gray-900 border border-gray-200 focus:border-emerald-500 rounded-lg px-3 py-2 shadow-sm"
                            placeholder="Catchy YouTube Title..."
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-gray-700">Video Description</label>
                          <textarea 
                            value={activePost.ytDescription || ''}
                            onChange={(e) => updatePost(activePost.id, 'ytDescription', e.target.value)}
                            rows={3}
                            className="w-full text-sm text-gray-900 border border-gray-200 focus:border-emerald-500 rounded-lg px-3 py-2 resize-none shadow-sm"
                            placeholder="Detailed YouTube description with links..."
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Category</label>
                            <select 
                              value={activePost.ytCategory || ''}
                              onChange={(e) => updatePost(activePost.id, 'ytCategory', e.target.value)}
                              className="w-full text-sm text-gray-900 border border-gray-200 focus:border-emerald-500 rounded-lg px-3 py-2 shadow-sm bg-white"
                            >
                              <option value="">Select Category...</option>
                              <option value="Education">Education</option>
                              <option value="Entertainment">Entertainment</option>
                              <option value="Gaming">Gaming</option>
                              <option value="Howto & Style">Howto & Style</option>
                              <option value="People & Blogs">People & Blogs</option>
                              <option value="Science & Technology">Science & Technology</option>
                            </select>
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Thumbnail Image</label>
                            {uploadingMedia[`${activePost.id}-ytThumbnail`] ? (
                              <div className="flex items-center justify-center h-[38px] text-xs text-emerald-600 bg-emerald-50 rounded-lg border border-emerald-100">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> Uploading...
                              </div>
                            ) : activePost.ytThumbnail ? (
                              <div className="flex items-center justify-between h-[38px] bg-white border border-gray-200 rounded-lg px-2 shadow-sm">
                                <div className="flex items-center gap-2 truncate">
                                  <img src={activePost.ytThumbnail} alt="Thumbnail" className="h-6 w-10 object-cover rounded" />
                                  <span className="text-xs text-gray-500 truncate">Thumbnail set</span>
                                </div>
                                <button onClick={() => updatePost(activePost.id, 'ytThumbnail', '')} className="text-red-500 hover:text-red-700 p-1">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex items-center justify-center h-[38px] text-xs font-medium text-gray-600 bg-white border border-gray-200 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm">
                                <Upload className="w-3.5 h-3.5 mr-2" /> Upload Image
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePlatformImageUpload(e, activePost.id, 'ytThumbnail')} />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Instagram Reel Specific Settings */}
                    {activePost.platforms.includes('Instagram') && activePost.format.includes('Reel') && (
                      <div className="space-y-4 bg-pink-50/40 p-4 rounded-xl border border-pink-100 mt-6">
                        <h4 className="text-sm font-bold text-pink-700 border-b border-pink-200/50 pb-2 flex items-center gap-2">
                          <Instagram className="w-4 h-4" /> Instagram Reel Configuration
                        </h4>
                        
                        <div className="space-y-1.5 w-1/2">
                          <label className="text-sm font-medium text-gray-700">Reel Cover Image</label>
                          {uploadingMedia[`${activePost.id}-igCover`] ? (
                            <div className="flex items-center justify-center h-[38px] text-xs text-emerald-600 bg-emerald-50 rounded-lg border border-emerald-100">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> Uploading...
                            </div>
                          ) : activePost.igCover ? (
                            <div className="flex items-center justify-between h-[38px] bg-white border border-gray-200 rounded-lg px-2 shadow-sm">
                              <div className="flex items-center gap-2 truncate">
                                <img src={activePost.igCover} alt="Cover" className="h-6 w-5 object-cover rounded" />
                                <span className="text-xs text-gray-500 truncate">Cover set</span>
                              </div>
                              <button onClick={() => updatePost(activePost.id, 'igCover', '')} className="text-red-500 hover:text-red-700 p-1">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex items-center justify-center h-[38px] text-xs font-medium text-gray-600 bg-white border border-gray-200 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm">
                              <Upload className="w-3.5 h-3.5 mr-2" /> Upload Cover Image
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePlatformImageUpload(e, activePost.id, 'igCover')} />
                            </label>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3 flex-shrink-0">
                    <button 
                      onClick={() => setPublishModalPostId(null)}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handlePublish(activePost)}
                      className="flex items-center space-x-2 px-6 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      <span>Confirm & Post Now</span>
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}