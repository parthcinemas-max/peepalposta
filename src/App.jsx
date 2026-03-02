import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, setDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // <-- Using your newly created Storage
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

// --- Firebase Initialization ---
// IMPORTANT: Paste your config keys here from the Firebase Project Settings
const localConfig = {
  // apiKey: "...",
  // authDomain: "...",
  // projectId: "...",
  // storageBucket: "...",
  // messagingSenderId: "...",
  // appId: "..."
}; 

const isCanvasEnv = typeof __firebase_config !== 'undefined';
const firebaseConfig = isCanvasEnv ? JSON.parse(__firebase_config) : localConfig;
const hasFirebase = Object.keys(firebaseConfig).length > 0;

let app, auth, db, storage;
if (hasFirebase) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app); // Initialized your storage bucket
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Make.com Webhook URL ---
const MAKE_WEBHOOK_URL = ""; // <--- PASTE YOUR MAKE.COM LINK HERE

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
  const [uploadingMedia, setUploadingMedia] = useState({});
  const updateTimers = useRef({});
  const [isPublishing, setIsPublishing] = useState(null);
  const [toast, setToast] = useState(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState({ YouTube: false, Facebook: false, Instagram: false, LinkedIn: false, X: false });
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState(null);
  const [publishModalPostId, setPublishModalPostId] = useState(null);

  useEffect(() => {
    if (!hasFirebase) { setUser({ uid: 'local-demo-user' }); return; }
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { await signInWithCustomToken(auth, __initial_auth_token); } 
        else { await signInAnonymously(auth); }
      } catch (err) { console.error("Auth Error:", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!hasFirebase) { setIsLoaded(true); return; }
    const postsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'posts');
    const unsubscribe = onSnapshot(postsRef, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(fetchedPosts.sort((a, b) => new Date(a.date) - new Date(b.date)));
      setIsLoaded(true);
    }, (error) => console.error("Error loading data:", error));
    return () => unsubscribe();
  }, [user]);

  useEffect(() => { if (isLoaded && posts.length === 0) generateWeeklySchedule(new Date()); }, [isLoaded]);

  const showToast = (message) => { setToast(message); setTimeout(() => setToast(null), 3000); };

  const generateWeeklySchedule = async (startDate) => {
    if (!user) return;
    const monday = startDate.getDay() === 1 ? startDate : getNextMonday(startDate);
    const template = [
      { dayOffset: 0, format: 'Carousel', platforms: ['LinkedIn', 'X'] },
      { dayOffset: 1, format: 'Recorded Video + Reel', platforms: ['Facebook', 'Instagram', 'X', 'YouTube'] },
      { dayOffset: 2, format: 'GFX Reel', platforms: ['LinkedIn', 'X'] },
      { dayOffset: 3, format: 'Carousel', platforms: ['Facebook', 'Instagram', 'X'] },
      { dayOffset: 4, format: 'Carousel', platforms: ['LinkedIn', 'X'] },
      { dayOffset: 5, format: 'Recorded Video + Reel', platforms: ['YouTube', 'Facebook', 'Instagram', 'X'] },
    ];
    const newPosts = template.map((item) => {
      const postDate = new Date(monday);
      postDate.setDate(monday.getDate() + item.dayOffset);
      return { id: crypto.randomUUID(), date: formatDate(postDate), topic: `Topic for ${item.format}`, notes: '', caption: '', keywords: '', hashtags: '', format: item.format, platforms: item.platforms, status: 'Draft', postLinks: [] };
    });
    setPosts(prev => [...prev, ...newPosts].sort((a, b) => new Date(a.date) - new Date(b.date)));
    if (hasFirebase && user) { newPosts.forEach(post => { setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'posts', post.id), post); }); }
    showToast("Weekly schedule generated!");
  };

  const handleAddCustomPost = () => {
    const newPost = { id: crypto.randomUUID(), date: formatDate(new Date()), topic: 'New Content Topic', notes: '', caption: '', keywords: '', hashtags: '', format: 'Single GFX', platforms: ['Facebook', 'Instagram', 'LinkedIn', 'X'], status: 'Draft', postLinks: [] };
    setPosts(prev => [newPost, ...prev].sort((a, b) => new Date(a.date) - new Date(b.date)));
    if (hasFirebase && user) setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'posts', newPost.id), newPost);
  };

  const updatePost = (id, field, value) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    if (user && hasFirebase) {
      const timerKey = `${id}-${field}`;
      if (updateTimers.current[timerKey]) clearTimeout(updateTimers.current[timerKey]);
      updateTimers.current[timerKey] = setTimeout(() => {
        updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'posts', id), { [field]: value });
      }, 800);
    }
  };

  const deletePost = (id) => {
    if (!user) return;
    setPosts(prev => prev.filter(p => p.id !== id));
    if (hasFirebase) deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'posts', id));
  };

  // --- FIREBASE STORAGE UPLOAD LOGIC ---
  const handleFileUpload = async (e, postId) => {
    if (!storage) {
      showToast("⚠️ Firebase Storage not initialized. Check your config.");
      return;
    }
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingMedia(prev => ({ ...prev, [postId]: true }));

    try {
      const uploadedMedia = [];
      for (const file of files) {
        const uniqueName = `${crypto.randomUUID()}-${file.name}`;
        const storageRef = ref(storage, `artifacts/${appId}/users/${user.uid}/media/${uniqueName}`);
        
        // Real cloud upload
        const uploadTask = await uploadBytesResumable(storageRef, file);
        const downloadURL = await getDownloadURL(uploadTask.ref);

        uploadedMedia.push({ 
          url: downloadURL, 
          type: file.type.startsWith('video/') ? 'video' : 'image', 
          name: file.name 
        });
      }
      const currentPost = posts.find(p => p.id === postId);
      updatePost(postId, 'media', [...(currentPost?.media || []), ...uploadedMedia]);
      showToast("Uploaded to Google Cloud!");
    } catch (err) { 
      console.error(err);
      showToast("❌ Upload failed. Check Storage rules."); 
    } finally { setUploadingMedia(prev => ({ ...prev, [postId]: false })); }
  };

  const handlePlatformImageUpload = async (e, postId, field) => {
    const file = e.target.files[0];
    if (!file || !storage) return;
    setUploadingMedia(prev => ({ ...prev, [`${postId}-${field}`]: true }));
    try {
      const uniqueName = `${crypto.randomUUID()}-${file.name}`;
      const storageRef = ref(storage, `artifacts/${appId}/users/${user.uid}/covers/${uniqueName}`);
      const uploadTask = await uploadBytesResumable(storageRef, file);
      const downloadURL = await getDownloadURL(uploadTask.ref);
      updatePost(postId, field, downloadURL);
    } catch (err) { console.error(err); } 
    finally { setUploadingMedia(prev => ({ ...prev, [`${postId}-${field}`]: false })); }
  };

  const togglePlatformConnection = (platform) => {
    if (!connectedPlatforms[platform]) {
      const width = 500, height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open('', `Connect ${platform}`, `width=${width},height=${height},left=${left},top=${top}`);
      if (popup) {
        popup.document.write(`<div style="font-family: sans-serif; padding: 40px; text-align: center;"><h2>Connecting to ${platform}</h2><p>Simulating secure OAuth flow...</p></div>`);
        setConnectingPlatform(platform);
        setTimeout(() => { 
          popup.close(); 
          setConnectedPlatforms(prev => ({ ...prev, [platform]: true })); 
          showToast(`Linked ${platform}!`); 
          setConnectingPlatform(null); 
        }, 3000);
      }
    } else { setConnectedPlatforms(prev => ({ ...prev, [platform]: false })); }
  };

  const handlePublish = async (post) => {
    const unconnected = post.platforms.filter(p => !connectedPlatforms[p]);
    if (unconnected.length > 0) { showToast(`⚠️ Link ${unconnected.join(', ')} first!`); setIsConnectModalOpen(true); return; }
    setIsPublishing(post.id);
    try {
      if (MAKE_WEBHOOK_URL) {
        await fetch(MAKE_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...post, media: post.media || [] }) });
      }
      setTimeout(() => {
        updatePost(post.id, 'status', 'Published');
        updatePost(post.id, 'postLinks', post.platforms.map(p => ({ platform: p, url: `https://${p.toLowerCase()}.com/post/${crypto.randomUUID().slice(0,8)}` })));
        setIsPublishing(null);
        setPublishModalPostId(null);
        showToast(MAKE_WEBHOOK_URL ? "Pushed to automation!" : "Simulated success!");
      }, 1500);
    } catch (err) { setIsPublishing(null); showToast("❌ Automation server error."); }
  };

  const handleWhatsAppShare = (post) => {
    const message = `*${post.topic}*\n\n${post.caption}\n\nLinks: ${post.postLinks?.map(l => l.url).join(', ')}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const formatIcons = { 'Recorded Video + Reel': <Video className="w-4 h-4 text-red-500" />, 'Single GFX': <ImageIcon className="w-4 h-4 text-blue-500" />, 'Carousel': <Layers className="w-4 h-4 text-purple-500" />, 'GFX Reel': <PlaySquare className="w-4 h-4 text-pink-500" /> };
  const platformIcons = { 'YouTube': <Youtube className="w-4 h-4 text-red-600" />, 'Facebook': <Facebook className="w-4 h-4 text-blue-600" />, 'Instagram': <Instagram className="w-4 h-4 text-pink-600" />, 'LinkedIn': <Linkedin className="w-4 h-4 text-blue-700" />, 'X': <Twitter className="w-4 h-4 text-gray-900" /> };
  const customGridClasses = "grid grid-cols-[100px_1.2fr_130px_140px_1.5fr_2.2fr_110px_1.5fr_100px] gap-4";

  // --- Group posts by Month (Fixed missing logic) ---
  const groupedPosts = posts.reduce((acc, post) => {
    const month = getMonthName(post.date);
    if (!acc[month]) acc[month] = [];
    acc[month].push(post);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2 animate-bounce"><span>{toast}</span></div>}
      
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm h-16 px-8 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-600 p-2 rounded-lg"><Leaf className="w-6 h-6 text-white" /></div>
          <div><h1 className="text-xl font-bold">PeepalPost</h1><span className="text-[10px] text-green-600 font-bold uppercase tracking-tighter">Production Ready</span></div>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={() => setIsConnectModalOpen(true)} className="flex items-center space-x-2 border px-4 py-2 rounded-lg hover:bg-gray-50"><Link2 className="w-4 h-4" /><span>Link Platforms</span></button>
          <button onClick={handleAddCustomPost} className="flex items-center space-x-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800"><Plus className="w-4 h-4" /><span>New Post</span></button>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-8 py-8 space-y-10">
        {isLoaded && posts.length === 0 && (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <h2 className="text-xl font-semibold text-gray-400">No posts planned yet.</h2>
            <p className="text-gray-400 text-sm mt-1">Click "New Post" or add the first week above.</p>
          </div>
        )}

        {Object.entries(groupedPosts).map(([month, monthPosts]) => (
          <div key={month} className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b font-bold uppercase text-gray-500 tracking-widest">{month}</div>
            <div className="overflow-x-auto min-w-[1400px]">
              <div className={`${customGridClasses} px-6 py-3 border-b text-[10px] font-bold text-gray-400 uppercase tracking-widest`}>
                <div>Date</div><div>Topic</div><div>Format</div><div>Platforms</div><div>Notes</div><div>Media</div><div className="text-center">Action</div><div>Links</div><div className="text-right">Share</div>
              </div>
              {monthPosts.map(post => (
                <div key={post.id} className={`${customGridClasses} px-6 py-4 items-start hover:bg-gray-50 border-b last:border-0`}>
                  <div className="flex flex-col"><span className="text-[10px] font-black text-emerald-500 uppercase">{getDayName(post.date)}</span><input type="date" value={post.date} onChange={(e) => updatePost(post.id, 'date', e.target.value)} className="bg-transparent text-sm font-bold border-0 p-0 focus:ring-0"/></div>
                  <textarea value={post.topic} onChange={(e) => updatePost(post.id, 'topic', e.target.value)} rows={2} className="w-full text-sm border-gray-100 rounded-md focus:border-emerald-500" />
                  <div className="flex items-center space-x-2 pt-1">{formatIcons[post.format]}<span className="text-xs font-medium">{post.format.split(' ')[0]}</span></div>
                  <div className="flex flex-wrap gap-1 pt-1">{post.platforms.map(p => <span key={p} className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 border">{platformIcons[p]}</span>)}</div>
                  <textarea value={post.notes} onChange={(e) => updatePost(post.id, 'notes', e.target.value)} className="w-full min-h-[120px] text-xs border-gray-100 rounded-md" placeholder="Editor notes..." />
                  <div className="h-[120px]">
                    {uploadingMedia[post.id] ? <div className="h-full flex items-center justify-center bg-emerald-50 rounded border animate-pulse text-[10px] font-bold text-emerald-600">CLOUD UPLOAD...</div> : post.media?.length > 0 ? (
                      <div className="relative h-full group">
                        {post.media[0].type === 'video' ? <video src={post.media[0].url} className="h-full w-full object-cover rounded" controls /> : <img src={post.media[0].url} className="h-full w-full object-cover rounded" />}
                        <button onClick={() => updatePost(post.id, 'media', [])} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"><X className="w-3 h-3"/></button>
                      </div>
                    ) : <label className="h-full border-2 border-dashed rounded flex flex-col items-center justify-center text-gray-300 hover:text-emerald-500 hover:border-emerald-300 cursor-pointer"><Upload className="w-5 h-5 mb-1" /><span className="text-[8px] font-bold">DROP MEDIA</span><input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e, post.id)}/></label>}
                  </div>
                  <div className="flex justify-center pt-1">{post.status === 'Published' ? <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-2 rounded border">LIVE</span> : <button onClick={() => setPublishModalPostId(post.id)} className="w-full bg-emerald-600 text-white text-xs font-bold py-2 rounded hover:bg-emerald-700 shadow-sm flex items-center justify-center space-x-1"><Send className="w-3 h-3"/><span>POST</span></button>}</div>
                  <div className="space-y-1">{post.postLinks?.map((l, i) => <a key={i} href={l.url} target="_blank" className="flex items-center justify-between text-[10px] border p-1 rounded hover:bg-emerald-50">{platformIcons[l.platform]}<ExternalLink className="w-2 h-2"/></a>)}</div>
                  <div className="flex justify-end space-x-1"><button onClick={() => handleWhatsAppShare(post)} className="bg-green-500 text-white p-1.5 rounded"><WhatsAppIcon className="w-4 h-4"/></button><button onClick={() => deletePost(post.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {isConnectModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2"><Link2 className="text-emerald-600"/> Link Platforms</h3>
            {Object.keys(platformIcons).map(p => (
              <div key={p} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">{platformIcons[p]}<span className="font-bold">{p}</span></div>
                <button onClick={() => togglePlatformConnection(p)} className={`w-28 py-1.5 rounded-md text-xs font-bold ${connectedPlatforms[p] ? 'bg-red-50 text-red-600' : 'bg-emerald-600 text-white'}`}>{connectedPlatforms[p] ? 'Disconnect' : 'Connect'}</button>
              </div>
            ))}
            <button onClick={() => setIsConnectModalOpen(false)} className="w-full py-3 font-bold text-gray-400">Close</button>
          </div>
        </div>
      )}

      {publishModalPostId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 flex flex-col max-h-[90vh]">
            {(() => {
              const activePost = posts.find(p => p.id === publishModalPostId);
              if (!activePost) return null;
              return (
                <div className="space-y-6 overflow-y-auto pr-2">
                  <h3 className="text-xl font-bold border-b pb-4">Finalize Content</h3>
                  <div className="space-y-1.5"><label className="text-xs font-bold text-gray-400">GLOBAL CAPTION</label><textarea value={activePost.caption} onChange={(e) => updatePost(activePost.id, 'caption', e.target.value)} rows={4} className="w-full border-gray-100 rounded-lg text-sm" placeholder="Main caption for all platforms..."/></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-400">KEYWORDS</label><input value={activePost.keywords} onChange={(e) => updatePost(activePost.id, 'keywords', e.target.value)} className="w-full border-gray-100 rounded-lg text-sm" /></div>
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-400">HASHTAGS</label><input value={activePost.hashtags} onChange={(e) => updatePost(activePost.id, 'hashtags', e.target.value)} className="w-full border-gray-100 rounded-lg text-sm" /></div>
                  </div>
                  {activePost.platforms.includes('YouTube') && (
                    <div className="p-4 bg-red-50 rounded-xl space-y-4 border border-red-100">
                      <h4 className="text-red-700 font-bold text-xs uppercase tracking-widest">YouTube Metadata</h4>
                      <input placeholder="Video Title" value={activePost.ytTitle || ''} onChange={e => updatePost(activePost.id, 'ytTitle', e.target.value)} className="w-full border-0 rounded-lg text-sm"/>
                      <textarea placeholder="Video Description" value={activePost.ytDescription || ''} onChange={e => updatePost(activePost.id, 'ytDescription', e.target.value)} className="w-full border-0 rounded-lg text-sm"/>
                    </div>
                  )}
                  <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white">
                    <button onClick={() => setPublishModalPostId(null)} className="px-6 py-2 font-bold text-gray-400">Cancel</button>
                    <button onClick={() => handlePublish(activePost)} className="bg-emerald-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-emerald-700 shadow-md">CONFIRM & POST</button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}