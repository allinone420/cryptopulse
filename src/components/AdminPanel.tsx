import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, deleteDoc, doc, where, Timestamp } from 'firebase/firestore';
import { UserData } from '../types/game';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, BarChart3, List, Trash2, X, Menu, Search, LogOut, ChevronRight, Calendar } from 'lucide-react';

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  const ADMIN_PASSWORD = "SATO_ADMIN_SECRET_2026"; // Changeable

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      fetchStats();
    } else {
      alert("Invalid Admin Password");
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('totalCoins', 'desc'));
      const snap = await getDocs(q);
      const allUsers = snap.docs.map(doc => doc.data() as UserData);
      setUsers(allUsers);
      setTotalUsers(allUsers.length);
      
      // Calculate Active Users (Last 24h)
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const active = allUsers.filter(u => u.lastActive && u.lastActive > oneDayAgo);
      setActiveUsers(active.length);
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteUserAccount = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    
    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers(prev => prev.filter(u => u.uid !== userId));
      setTotalUsers(prev => prev - 1);
      setSelectedUser(null);
      alert("User deleted successfully.");
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete user.");
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.uid.includes(searchTerm) ||
    u.telegramId.toString().includes(searchTerm)
  );

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
          
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input 
              type="password" 
              placeholder="Enter Access Key"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-accent-gold transition-colors"
            />
            <button className="w-full bg-accent-gold text-black py-4 rounded-xl font-black uppercase text-sm tracking-widest shadow-xl shadow-accent-gold/20">
              Access Dashboard
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d] flex flex-col md:flex-row text-white font-sans">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-card-bg border-b border-white/10">
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
            </nav>

            <div className="mt-auto pt-6 border-t border-white/10 flex flex-col gap-4">
              <div className="p-4 bg-white/5 rounded-xl text-center">
                <p className="text-[10px] text-text-secondary uppercase">Connected as</p>
                <p className="text-xs font-bold truncate">Root Administrator</p>
              </div>
              <button onClick={() => setIsAuthenticated(false)} className="flex items-center justify-center gap-2 text-red-400 font-bold p-3 rounded-xl hover:bg-red-400/10 text-sm">
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
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-h-screen">
        {activeTab === 'dashboard' ? (
          <div className="flex flex-col gap-8">
            <header>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter">Dashboard</h1>
              <p className="text-text-secondary italic">Real-time platform overview</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-card-bg p-6 rounded-3xl border border-white/10 flex flex-col gap-2">
                <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center">
                  <Users size={20} />
                </div>
                <p className="text-text-secondary text-sm font-bold uppercase tracking-widest mt-2">Total Users</p>
                <div className="text-4xl font-black">{totalUsers.toLocaleString()}</div>
              </div>

              <div className="bg-card-bg p-6 rounded-3xl border border-white/10 flex flex-col gap-2">
                <div className="w-10 h-10 bg-green-500/20 text-green-400 rounded-xl flex items-center justify-center">
                  <Calendar size={20} />
                </div>
                <p className="text-text-secondary text-sm font-bold uppercase tracking-widest mt-2">Daily Active (DAU)</p>
                <div className="text-4xl font-black">{activeUsers.toLocaleString()}</div>
              </div>

              <div className="bg-card-bg p-6 rounded-3xl border border-white/10 flex flex-col gap-2">
                <div className="w-10 h-10 bg-accent-gold/20 text-accent-gold rounded-xl flex items-center justify-center">
                  <ChevronRight size={20} />
                </div>
                <p className="text-text-secondary text-sm font-bold uppercase tracking-widest mt-2">Status</p>
                <div className="text-4xl font-black text-green-400">Live</div>
              </div>
            </div>

            {/* Quick stats / Recent items can go here */}
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
        ) : (
          <div className="flex flex-col gap-6">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter">User Management</h1>
                <p className="text-text-secondary italic">Manage and monitor all participants</p>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                <input 
                  type="text" 
                  placeholder="Search Users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-card-bg border border-white/10 pl-12 pr-6 py-3 rounded-2xl outline-none focus:border-accent-gold transition-all w-full sm:w-64"
                />
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
                               {user.username.charAt(0).toUpperCase()}
                             </div>
                             <div>
                               <p className="font-bold">{user.username}</p>
                               <p className="text-[10px] text-text-secondary font-mono">{user.telegramId}</p>
                             </div>
                           </div>
                         </td>
                         <td className="p-6 font-mono font-bold text-accent-gold">{Math.floor(user.coins).toLocaleString()}</td>
                         <td className="p-6">
                           <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black">Level {user.level}</span>
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
        )}
      </main>

      {/* User Details Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card-bg w-full max-w-lg rounded-3xl border border-white/10 p-8 relative shadow-2xl"
            >
              <button 
                onClick={() => setSelectedUser(null)}
                className="absolute top-6 right-6 p-2 bg-white/5 rounded-full"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col gap-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-accent-gold/20 text-accent-gold flex items-center justify-center font-black text-2xl">
                    {selectedUser.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">{selectedUser.username}</h2>
                    <p className="text-text-secondary font-mono text-xs">UID: {selectedUser.uid}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-text-secondary uppercase font-bold mb-1">Total Profits</p>
                    <p className="text-lg font-black text-accent-gold">{Math.floor(selectedUser.totalCoins).toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-text-secondary uppercase font-bold mb-1">Referrals</p>
                    <p className="text-lg font-black">{selectedUser.referralCount}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-text-secondary uppercase font-bold mb-1">Last Active</p>
                    <p className="text-xs font-bold">{selectedUser.lastActive ? new Date(selectedUser.lastActive).toLocaleString() : 'Never'}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-text-secondary uppercase font-bold mb-1">Created At</p>
                    <p className="text-xs font-bold text-text-secondary">Logged in System</p>
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
