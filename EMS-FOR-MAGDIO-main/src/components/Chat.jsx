import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Send, ArrowLeft, Search, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Chat() {
  const { currentUser, userData } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  const messagesEndRef = useRef(null);

  // Fetch all users to chat with
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        // Exclude current user and deleted users
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('isActive', '!=', false)); // just get active ones, but also handle no isActive field
        const snapshot = await getDocs(collection(db, 'users'));
        
        const fetchedUsers = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(u => u.id !== currentUser.uid && !u.isDeleted && u.isActive !== false);
        
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to load users list");
      } finally {
        setLoadingUsers(false);
      }
    };

    if (currentUser) {
      fetchUsers();
    }
  }, [currentUser]);

  // Generate unique room ID for two users
  const getRoomId = (uid1, uid2) => {
    return [uid1, uid2].sort().join('_');
  };

  // Fetch messages for active user
  useEffect(() => {
    if (!activeUser || !currentUser) return;

    const roomId = getRoomId(currentUser.uid, activeUser.id);
    const messagesRef = collection(db, 'chats', roomId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
    }, (error) => {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    });

    return () => unsubscribe();
  }, [activeUser, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeUser || !currentUser) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const roomId = getRoomId(currentUser.uid, activeUser.id);
      const messagesRef = collection(db, 'chats', roomId, 'messages');
      
      await addDoc(messagesRef, {
        text: messageText,
        senderId: currentUser.uid,
        senderName: userData?.name || currentUser.displayName || 'Unknown User',
        receiverId: activeUser.id,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      setNewMessage(messageText); // Restore on fail
    } finally {
      setSending(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-10rem)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
      
      {/* Users Sidebar */}
      <div className={`w-full md:w-80 flex-col border-r border-gray-100 bg-gray-50/50 transition-transform ${activeUser ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-100 bg-white shrink-0">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Messages</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Search team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingUsers ? (
            <div className="flex justify-center p-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No users found.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => setActiveUser(user)}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-white transition-colors text-left ${activeUser?.id === user.id ? 'bg-blue-50/50 hover:bg-blue-50/50' : ''}`}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.role} {user.department ? `• ${user.department}` : ''}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex-col bg-white absolute inset-0 md:static md:flex z-10 ${activeUser ? 'flex' : 'hidden'}`}>
        {activeUser ? (
          <>
            <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center gap-4 shrink-0 shadow-sm z-10">
              <button 
                onClick={() => setActiveUser(null)}
                className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                {activeUser.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">{activeUser.name}</h2>
                <p className="text-xs text-gray-500">{activeUser.role}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gray-50/30">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                    <MessageSquare className="w-6 h-6 text-gray-300" />
                  </div>
                  <p>No messages yet.</p>
                  <p className="text-sm">Start the conversation with {activeUser.name}!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === currentUser?.uid;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-baseline gap-2 mb-1 px-1">
                        <span className="text-xs font-semibold text-gray-600">{msg.senderName}</span>
                        {msg.createdAt && (
                          <span className="text-[10px] text-gray-400">
                            {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        )}
                      </div>
                      <div 
                        className={`max-w-[85%] md:max-w-[75%] px-4 py-2.5 rounded-2xl ${
                          isMe 
                            ? 'bg-blue-600 text-white rounded-tr-sm shadow-md shadow-blue-600/10' 
                            : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm shadow-sm'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 shrink-0">
              <div className="relative flex items-center gap-2 max-w-4xl mx-auto">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message ${activeUser.name}...`}
                  className="flex-1 pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm md:text-base"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50/50">
            <div className="text-center text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">Select a conversation</p>
              <p className="text-sm mt-1">Choose a team member from the list to start chatting.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
