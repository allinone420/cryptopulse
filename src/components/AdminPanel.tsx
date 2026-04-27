import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, query, orderBy, deleteDoc, doc, where, Timestamp, getCountFromServer, limit } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { UserData } from '../types/game';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, BarChart3, List, Trash2, X, Menu, Search, LogOut, ChevronRight, Calendar, Lock, Mail, Zap, Wallet, Settings, Check } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminUser, setAdminUser] = useState<any>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'settings'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  // Settings State
  const [referrerReward, setReferrerReward] = useState(5000);
  const [refereeReward, setRefereeReward] = useState(2500);
  const [passiveCommission, setPassiveCommission] = useState(10);
  const [savingSettings, setSavingSettings] = useState(false);

  const ADMIN_EMAILS = ["md.khotiborrahman@gmail.com"];
  const ADMIN_UIDS = ["exJ8T8grBxVQPmIdQXJu5259dFl2"];

  const checkIsAdmin = (user: any) => {
    if (!user) return false;
    if (user.isAnonymous) return false;
    return ADMIN_EMAILS.includes(user.email) || ADMIN_UIDS.includes(user.uid);
  };

  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (!auth) {
      setCheckingAuth(false);
      return;
    }

    // Safety timeout: If auth hasn't responded in 5 seconds, stop loading
    const safetyTimeout = setTimeout(() => {
      setCheckingAuth(false);
    }, 5000);

    // Immediate check if currentUser is already synchronously available
    if (auth.currentUser && !auth.currentUser.isAnonymous && !isAuthenticated) {
      setAdminUser(auth.currentUser);
      if (checkIsAdmin(auth.currentUser)) {
        setIsAuthenticated(true);
        fetchStats();
      }
      setCheckingAuth(false);
      clearTimeout(safetyTimeout);
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(safetyTimeout);
      if (user && !user.isAnonymous) {
        setAdminUser(user);
        // Only auto-authenticate if they fulfill admin criteria
        if (checkIsAdmin(user) && !isAuthenticated) {
          setIsAuthenticated(true);
          fetchStats();
        } else if (!checkIsAdmin(user)) {
          // If logged in but not admin, stay on login screen but show email
          setIsAuthenticated(false);
          if (user.email && !ADMIN_EMAILS.includes(user.email)) {
            setError(`Account ${user.email} is not authorized for admin access.`);
          }
        }
      } else {
        setIsAuthenticated(false);
        setAdminUser(null);
      }
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      if (!db) throw new Error("DB not initialized");
      await setDoc(doc(db, 'settings', 'global'), {
        referrerReward,
        refereeReward,
        passiveCommission,
        updatedAt: serverTimestamp(),
        updatedBy: adminUser?.email || 'Admin'
      }, { merge: true });
      alert("Settings saved successfully!");
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      alert("Failed to save: " + (err.message || "Unknown error"));
    } finally {
      setSavingSettings(false);
    }
  };
  const formatNumber = (num: number) => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return Math.floor(num).toString();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!auth) throw new Error("Auth not initialized");
      
      // Use session persistence for better reliability in sandboxed iframes
      await setPersistence(auth, browserSessionPersistence);
      
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      if (checkIsAdmin(user)) {
        setIsAuthenticated(true);
        fetchStats();
      } else {
        // If not an admin, we must sign out to prevent the session from persisting
        await signOut(auth);
        throw new Error("Access Denied: Your account (" + user.email + ") is not listed as an administrator.");
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      let msg = "Invalid login credentials.";
      if (err.code === "auth/user-not-found") msg = "No administrator account found with this email.";
      else if (err.code === "auth/wrong-password") msg = "Incorrect password.";
      else if (err.code === "auth/invalid-credential") msg = "The email or password you entered is incorrect.";
      else if (err.code === "auth/network-request-failed") msg = "Network error. Please check your connection.";
      else if (err.code === "auth/too-many-requests") msg = "Access blocked due to many failed attempts. Try again later.";
      else if (err.message) {
        // Strip Firebase prefix if present
        msg = err.message.replace(/^Firebase:\s*Error\s*\(([^)]+)\)\.?\s*/i, '$1').replace(/-/g, ' ');
        // Capitalize first letter
        msg = msg.charAt(0).toUpperCase() + msg.slice(1);
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAuthenticated(false);
      setUsers([]);
      setAdminUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!db) throw new Error("Database not initialized");
      
      // Fetch Settings
      const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setReferrerReward(data.referrerReward || 5000);
        setRefereeReward(data.refereeReward || 2500);
        setPassiveCommission(data.passiveCommission || 10);
      }
      const coll = collection(db, 'users');
      let countSnapshot;
      try {
        countSnapshot = await getCountFromServer(coll);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'users_count');
        return;
      }
      setTotalUsers(countSnapshot.data().count);

      // Get Top Users (for the list)
      const q = query(collection(db, 'users'), orderBy('totalCoins', 'desc'), limit(100));
      let snap;
      try {
        snap = await getDocs(q);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'users_top_100');
        return;
      }
      const allUsers = snap.docs.map(doc => doc.data() as UserData);
      setUsers(allUsers);
      
      // Calculate Aggregates (from top users as a sample)
      let coins = 0;
      let refs = 0;
      allUsers.forEach(u => {
        coins += (u.totalCoins || 0);
        refs += (u.referralCount || 0);
      });
      setTotalCoins(coins);
      setTotalReferrals(refs);
      
      // Calculate Active Users (Last 24h)
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const active = allUsers.filter(u => u.lastActive && u.lastActive > oneDayAgo);
      setActiveUsers(active.length);
    } catch (err: any) {
      console.error("Failed to fetch admin data:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async () => {
    if (!searchTerm.trim()) {
      fetchStats();
      return;
    }

    setLoading(true);
    try {
      // Search by Telegram ID (if numeric), Username, or Wallet Address
      let q;
      const term = searchTerm.trim();
      if (!isNaN(Number(term))) {
        q = query(collection(db, 'users'), where('telegramId', '==', Number(term)));
      } else if (term.startsWith('0x') || term.startsWith('EQ') || term.length > 25) {
        // Search by Wallet or UID
        // Try walletAddress first
        const walletSnap = await getDocs(query(collection(db, 'users'), where('walletAddress', '==', term)));
        if (!walletSnap.empty) {
          setUsers(walletSnap.docs.map(doc => doc.data() as UserData));
          setLoading(false);
          return;
        }
        q = query(collection(db, 'users'), where('uid', '==', term));
      } else {
        q = query(collection(db, 'users'), where('username', '==', term));
      }
      
      const snap = await getDocs(q);
      const foundUsers = snap.docs.map(doc => doc.data() as UserData);
      
      if (foundUsers.length === 0 && term.length > 5) {
        // Try searching by UID if it looks like one
        const uidSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', term)));
        const foundByUid = uidSnap.docs.map(doc => doc.data() as UserData);
        setUsers(foundByUid);
      } else {
        setUsers(foundUsers);
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.LIST, `users_search_${searchTerm}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteUserAccount = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    
    try {
      if (!db) throw new Error("DB not initialized");
      await deleteDoc(doc(db, 'users', userId));
      setUsers(prev => prev.filter(u => u.uid !== userId));
      setTotalUsers(prev => prev - 1);
      setSelectedUser(null);
      alert("User deleted successfully.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
    }
  };

  const filteredUsers = users.filter(u => {
    if (!u) return false;
    const name = (u.username || '').toLowerCase();
    const uid = (u.uid || '').toLowerCase();
    const tid = (u.telegramId || '').toString();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || uid.includes(search) || tid.includes(searchTerm);
  });

  const renderMainContent = () => {
    if (loading && !users.length) {
      return (
        <div className="flex items-center justify-center h-64">
           <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="flex flex-col gap-8">
            <header className="sticky top-0 z-[30] bg-[#0a0b0d] pt-6 pb-6 md:pt-10 flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter">Dashboard</h1>
                <p className="text-text-secondary italic">Real-time platform overview</p>
              </div>
              <button 
                onClick={fetchStats}
                disabled={loading}
                className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <Calendar className={loading ? 'animate-spin' : ''} size={18} />
              </button>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card-bg p-6 rounded-3xl border border-white/10 flex flex-col gap-2 shadow-xl">
                <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center">
                  <Users size={20} />
                </div>
                <p className="text-text-secondary text-[10px] font-black uppercase tracking-widest mt-2">Total Users</p>
                <div className="text-3xl font-black">{totalUsers.toLocaleString()}</div>
              </div>

              <div className="bg-card-bg p-6 rounded-3xl border border-white/10 flex flex-col gap-2 shadow-xl">
                <div className="w-10 h-10 bg-green-500/20 text-green-400 rounded-xl flex items-center justify-center">
                  <Calendar size={20} />
                </div>
                <p className="text-text-secondary text-[10px] font-black uppercase tracking-widest mt-2">DAU (Top 100)</p>
                <div className="text-3xl font-black">{activeUsers.toLocaleString()}</div>
              </div>

              <div className="bg-card-bg p-6 rounded-3xl border border-white/10 flex flex-col gap-2 shadow-xl">
                <div className="w-10 h-10 bg-accent-gold/20 text-accent-gold rounded-xl flex items-center justify-center">
                  <BarChart3 size={20} />
                </div>
                <p className="text-text-secondary text-[10px] font-black uppercase tracking-widest mt-2">Total System Coins</p>
                <div className="text-2xl md:text-3xl font-black text-accent-gold truncate" title={totalCoins.toLocaleString()}>{formatNumber(totalCoins)}</div>
              </div>

              <div className="bg-card-bg p-6 rounded-3xl border border-white/10 flex flex-col gap-2 shadow-xl">
                <div className="w-10 h-10 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center">
                  <Users size={20} />
                </div>
                <p className="text-text-secondary text-[10px] font-black uppercase tracking-widest mt-2">Total Referrals</p>
                <div className="text-2xl md:text-3xl font-black font-mono truncate" title={totalReferrals.toLocaleString()}>{formatNumber(totalReferrals)}</div>
              </div>
            </div>

            <div className="bg-card-bg rounded-3xl border border-white/10 overflow-hidden">
               <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                 <h3 className="font-bold uppercase tracking-widest">Growth Analytics</h3>
                 <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded-full font-bold">STABLE</span>
               </div>
               <div className="p-10 flex flex-col items-center justify-center text-center gap-4">
                  <BarChart3 size={60} className="text-white/10" />
                  <p className="text-text-secondary text-sm italic">User growth tracking is automatically generated based on registration logs.</p>
               </div>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="flex flex-col gap-8 max-w-4xl">
            <header className="sticky top-0 z-[30] bg-[#0a0b0d] pt-6 pb-6 md:pt-10">
              <h1 className="text-3xl font-black italic uppercase tracking-tighter">Global Settings</h1>
              <p className="text-text-secondary italic">Configure rewards and platform parameters</p>
            </header>

            <div className="grid gap-6">
              <div className="bg-card-bg p-8 rounded-3xl border border-white/10 shadow-xl flex flex-col gap-6">
                <div className="flex items-center gap-3 text-accent-gold mb-2">
                  <Users size={20} />
                  <h3 className="font-black uppercase tracking-widest text-sm">Referral Rewards</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase font-black text-text-secondary tracking-widest ml-1">Referrer Reward (Coins)</label>
                    <input 
                      type="number" 
                      value={referrerReward}
                      onChange={(e) => setReferrerReward(Number(e.target.value))}
                      className="bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-accent-gold text-white font-bold"
                    />
                    <p className="text-[10px] text-text-secondary italic ml-1">Bonus given to the person who invited the friend.</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase font-black text-text-secondary tracking-widest ml-1">Referee Reward (New User Coins)</label>
                    <input 
                      type="number" 
                      value={refereeReward}
                      onChange={(e) => setRefereeReward(Number(e.target.value))}
                      className="bg-card-bg border border-white/10 p-4 rounded-xl outline-none focus:border-accent-gold text-white font-bold"
                    />
                    <p className="text-[10px] text-text-secondary italic ml-1">Welcome bonus for the new user arriving via link.</p>
                  </div>
                </div>
              </div>

              <div className="bg-card-bg p-8 rounded-3xl border border-white/10 shadow-xl flex flex-col gap-6">
                <div className="flex items-center gap-3 text-blue-400 mb-2">
                  <Zap size={20} />
                  <h3 className="font-black uppercase tracking-widest text-sm">Commission System</h3>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase font-black text-text-secondary tracking-widest ml-1">Passive Income Commission (%)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={passiveCommission}
                      onChange={(e) => setPassiveCommission(Number(e.target.value))}
                      className="flex-1 accent-accent-gold"
                    />
                    <span className="w-16 text-center font-bold text-xl">{passiveCommission}%</span>
                  </div>
                  <p className="text-[10px] text-text-secondary italic ml-1">Percentage of passive income collected by users that is awarded as a bonus to their referrer.</p>
                </div>
              </div>

              <button 
                onClick={saveSettings}
                disabled={savingSettings}
                className="bg-accent-gold text-black py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-accent-gold/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingSettings ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Check size={18} />}
                Save Configuration
              </button>
            </div>
          </div>
        );
      case 'users':
      default:
        return (
          <div className="flex flex-col gap-6">
            <header className="sticky top-0 z-[30] bg-[#0a0b0d] pt-6 pb-6 md:pt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter">User Management</h1>
                <p className="text-text-secondary italic">Manage and monitor all participants</p>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search Username or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                    className="bg-card-bg border border-white/10 pl-12 pr-6 py-3 rounded-2xl outline-none focus:border-accent-gold transition-all w-full"
                  />
                </div>
                <button 
                  onClick={performSearch}
                  className="bg-accent-gold text-black px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:brightness-110 active:scale-95 transition-all"
                >
                  Search
                </button>
              </div>
            </header>

            <div className="bg-card-bg rounded-3xl border border-white/10 overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest border-b border-white/10">
                       <th className="p-6">Username</th>
                       <th className="p-6">Coins</th>
                       <th className="p-6">Level</th>
                       <th className="p-6">Status</th>
                       <th className="p-6">Detail</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {filteredUsers.map((user) => (
                       <tr key={user.uid} className="hover:bg-white/[0.02] transition-colors">
                         <td className="p-6">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-accent-gold/20 text-accent-gold flex items-center justify-center font-bold text-xs">
                               {(user.username || 'A').charAt(0).toUpperCase()}
                             </div>
                             <div>
                               <p className="font-bold">{user.username || 'Anonymous'}</p>
                               <p className="text-[10px] text-text-secondary font-mono">{user.telegramId || 'N/A'}</p>
                             </div>
                           </div>
                         </td>
                         <td className="p-6 font-mono font-bold text-accent-gold">{formatNumber(user.totalCoins || user.coins || 0)}</td>
                         <td className="p-6">
                           <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black">Level {user.level || 1}</span>
                         </td>
                         <td className="p-6">
                           {user.lastActive && user.lastActive > Date.now() - 3600000 ? (
                             <span className="flex items-center gap-2 text-green-400 text-xs font-bold">
                               <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Online
                             </span>
                           ) : (
                             <span className="text-text-secondary text-xs">Offline</span>
                           )}
                         </td>
                         <td className="p-6">
                            <button 
                              onClick={() => setSelectedUser(user)}
                              className="p-2 hover:bg-white/10 rounded-lg text-accent-gold transition-all"
                            >
                              <ChevronRight size={20} />
                            </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               {filteredUsers.length === 0 && (
                 <div className="p-20 text-center text-text-secondary italic">No users found matching your search.</div>
               )}
            </div>
          </div>
        );
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] flex flex-col items-center justify-center gap-4">
         <div className="w-10 h-10 border-4 border-accent-gold border-t-transparent rounded-full animate-spin" />
         <p className="text-accent-gold/60 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Verifying Admin Session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-[#1c1f24] rounded-3xl p-8 border border-white/10 shadow-2xl"
        >
          <div className="flex flex-col items-center gap-6 mb-8 text-center">
            <div className="w-16 h-16 bg-accent-gold/20 rounded-2xl flex items-center justify-center text-accent-gold">
               <BarChart3 size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Admin Login</h1>
              <p className="text-text-secondary text-sm">Protected Area - SatoCryp Management</p>
            </div>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold text-center animate-pulse">
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
              <input 
                type="email" 
                placeholder="Admin Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 pl-12 pr-4 py-4 rounded-xl text-white outline-none focus:border-accent-gold transition-colors"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
              <input 
                type="password" 
                placeholder="Admin Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 pl-12 pr-4 py-4 rounded-xl text-white outline-none focus:border-accent-gold transition-colors"
                required
              />
            </div>
            <button 
              disabled={loading}
              className="w-full bg-accent-gold text-black py-4 rounded-xl font-black uppercase text-sm tracking-widest shadow-xl shadow-accent-gold/20 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Access Dashboard'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d] flex flex-col md:flex-row text-white font-sans">
      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-[40] flex items-center justify-between p-4 bg-card-bg border-b border-white/10">
        <div className="flex items-center gap-2">
           <BarChart3 className="text-accent-gold" />
           <span className="font-black uppercase tracking-tighter">Admin Panel</span>
        </div>
        <button onClick={() => setSidebarOpen(true)} className="p-2">
          <Menu />
        </button>
      </div>

      {/* Sidebar / Drawer */}
      <AnimatePresence>
        {(sidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
          <motion.aside 
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-card-bg border-r border-white/10 p-6 flex flex-col gap-8 md:relative md:translate-x-0"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="text-accent-gold" />
                <span className="font-black uppercase tracking-tighter">SatoAdmin</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="md:hidden">
                <X size={20} />
              </button>
            </div>

            <nav className="flex flex-col gap-2">
              <button 
                onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
                className={`flex items-center gap-3 p-4 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-accent-gold text-black font-bold' : 'text-text-secondary hover:bg-white/5'}`}
              >
                <BarChart3 size={20} /> Dashboard
              </button>
              <button 
                onClick={() => { setActiveTab('users'); setSidebarOpen(false); }}
                className={`flex items-center gap-3 p-4 rounded-xl transition-all ${activeTab === 'users' ? 'bg-accent-gold text-black font-bold' : 'text-text-secondary hover:bg-white/5'}`}
              >
                <List size={20} /> User List
              </button>
              <button 
                onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }}
                className={`flex items-center gap-3 p-4 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-accent-gold text-black font-bold' : 'text-text-secondary hover:bg-white/5'}`}
              >
                <Settings size={20} /> App Settings
              </button>
            </nav>

            <div className="mt-auto pt-6 border-t border-white/10 flex flex-col gap-4">
              <div className="p-4 bg-white/5 rounded-xl text-center">
                <p className="text-[10px] text-text-secondary uppercase">Connected as</p>
                <p className="text-xs font-bold truncate">{adminUser?.email || 'Administrator'}</p>
              </div>
              <button onClick={handleLogout} className="flex items-center justify-center gap-2 text-red-400 font-bold p-3 rounded-xl hover:bg-red-400/10 text-sm">
                <LogOut size={16} /> Logout
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Main Content */}
      <main className="flex-1 px-6 pb-6 md:px-10 md:pb-10 overflow-y-auto max-h-screen">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Error: {error}</p>
              <button onClick={fetchStats} className="text-[10px] font-black uppercase tracking-widest bg-red-500 text-white px-3 py-1 rounded-lg">Retry</button>
            </div>
            <p className="text-[10px] opacity-50">Auth Status: {isAuthenticated ? `Logged in as ${adminUser?.email}` : 'Not logged in'}</p>
          </div>
        )}

        {renderMainContent()}
      </main>

      {/* User Details Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card-bg w-full max-w-xl rounded-3xl border border-white/10 p-8 relative shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => setSelectedUser(null)}
                className="absolute top-6 right-6 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors z-10"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-accent-gold/20 text-accent-gold flex items-center justify-center font-black text-2xl shadow-inner border border-white/5">
                      {selectedUser.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-2">
                        {selectedUser.username}
                        <div className="flex flex-col items-center">
                          <span className="bg-gradient-to-r from-accent-gold to-[#ffd700] text-black text-[10px] font-black px-3 py-1 rounded-full shadow-[0_0_20px_rgba(243,186,47,0.4)] border border-white/20">
                            LEVEL {selectedUser.level}
                          </span>
                        </div>
                      </h2>
                      <p className="text-text-secondary font-mono text-[10px] tracking-wide mt-1">UID: {selectedUser.uid}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col justify-center min-w-0 relative group overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                      <BarChart3 size={24} />
                    </div>
                    <p className="text-[10px] text-text-secondary uppercase font-black mb-1 tracking-wider">Total Profits</p>
                    <p className="text-xl md:text-2xl font-black text-accent-gold truncate" title={selectedUser.totalCoins.toLocaleString()}>
                      {formatNumber(selectedUser.totalCoins)}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col justify-center min-w-0 relative group overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Users size={24} />
                    </div>
                    <p className="text-[10px] text-text-secondary uppercase font-black mb-1 tracking-wider">Referrals</p>
                    <p className="text-xl md:text-2xl font-black truncate">{selectedUser.referralCount}</p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col justify-center min-w-0 relative group overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Calendar size={24} />
                    </div>
                    <p className="text-[10px] text-text-secondary uppercase font-black mb-1 tracking-wider">Streak</p>
                    <p className="text-lg md:text-xl font-black truncate">{selectedUser.dailyStreak} Days</p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col justify-center min-w-0 relative group overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Zap size={24} className="text-blue-400" />
                    </div>
                    <p className="text-[10px] text-text-secondary uppercase font-black mb-1 tracking-wider">Passive Rate</p>
                    <p className="text-lg md:text-xl font-black text-blue-400 truncate">+{formatNumber(selectedUser.passiveIncomeRate)}/s</p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 col-span-2 overflow-hidden bg-gradient-to-br from-white/[0.02] to-transparent">
                    <p className="text-[10px] text-text-secondary uppercase font-black mb-2 tracking-wider flex items-center gap-2">
                       <Wallet size={12} /> Wallet Address
                    </p>
                    <p className="text-[10px] md:text-xs font-mono break-all opacity-80 bg-black/20 p-3 rounded-xl border border-white/5">
                      {selectedUser.walletAddress || 'No Wallet Connected'}
                    </p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col justify-center min-w-0">
                    <p className="text-[10px] text-text-secondary uppercase font-black mb-1 tracking-wider">Last Active</p>
                    <p className="text-[10px] md:text-xs font-bold truncate opacity-80">
                      {selectedUser.lastActive ? new Date(selectedUser.lastActive).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                    </p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col justify-center min-w-0">
                    <p className="text-[10px] text-text-secondary uppercase font-black mb-1 tracking-wider">Energy</p>
                    <p className="text-[10px] md:text-xs font-bold truncate bg-white/5 px-2 py-1 rounded-lg w-fit">
                      {formatNumber(selectedUser.energy)} / {formatNumber(selectedUser.maxEnergy)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <p className="text-[10px] text-text-secondary uppercase font-black px-1">Actions</p>
                  <button 
                    onClick={() => deleteUserAccount(selectedUser.uid)}
                    className="flex items-center justify-center gap-2 bg-red-500/10 text-red-400 py-4 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-red-500 transition-all hover:text-white"
                  >
                    <Trash2 size={16} /> Force Delete Account
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
