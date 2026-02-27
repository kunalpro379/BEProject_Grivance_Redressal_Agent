import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, X, Users, Phone, Video, MoreVertical, ArrowLeft } from 'lucide-react';
import axios from 'axios';

const ChatInterface = ({ currentUser, onClose }) => {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [accessibleUsers, setAccessibleUsers] = useState([]);
  const [showUserList, setShowUserList] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load user's chat rooms
  useEffect(() => {
    loadRooms();
    loadAccessibleUsers();
    setupWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Setup WebSocket for real-time messages
  const setupWebSocket = () => {
    const wsUrl = `ws://localhost:5000/ws/chat?userId=${currentUser.id}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'new_message') {
        // Add message to current room if it matches
        if (selectedRoom && data.room_id === selectedRoom.id) {
          setMessages(prev => [...prev, data.message]);
        }
        
        // Update room list
        loadRooms();
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const loadRooms = async () => {
    try {
      const response = await axios.get('/api/chat/rooms', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRooms(response.data.rooms || []);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    }
  };

  const loadAccessibleUsers = async () => {
    try {
      const response = await axios.get('/api/chat/accessible-users', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAccessibleUsers(response.data.users || []);
    } catch (error) {
      console.error('Failed to load accessible users:', error);
    }
  };

  const loadMessages = async (roomId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/chat/rooms/${roomId}/messages`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessages(response.data.messages || []);
      
      // Mark messages as read
      await axios.post('/api/chat/mark-read', 
        { roomId },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    loadMessages(room.id);
    setShowUserList(false);
  };

  const handleStartChat = async (user) => {
    try {
      const response = await axios.post('/api/chat/rooms/direct',
        { otherUserId: user.user_id },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );
      
      const room = response.data.room;
      setSelectedRoom(room);
      loadMessages(room.id);
      setShowUserList(false);
      loadRooms();
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedRoom) return;

    try {
      const response = await axios.post('/api/chat/messages',
        {
          roomId: selectedRoom.id,
          content: newMessage.trim(),
          messageType: 'text'
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );

      setMessages(prev => [...prev, response.data.message]);
      setNewMessage('');
      loadRooms(); // Update room list with new last message
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const getRoomDisplayName = (room) => {
    if (room.room_name) return room.room_name;
    
    if (room.other_members && room.other_members.length > 0) {
      return room.other_members.map(m => m.full_name).join(', ');
    }
    
    return 'Chat Room';
  };

  const getRoomAvatar = (room) => {
    if (room.other_members && room.other_members.length === 1) {
      return room.other_members[0].profile_image || '/default-avatar.png';
    }
    return '/group-avatar.png';
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Room List */}
      <div className={`w-80 bg-white border-r border-gray-200 flex flex-col ${showUserList ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
            <button
              onClick={() => setShowUserList(!showUserList)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="New Chat"
            >
              <Users className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          {/* Search */}
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Room List */}
        <div className="flex-1 overflow-y-auto">
          {rooms.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>No conversations yet</p>
              <button
                onClick={() => setShowUserList(true)}
                className="mt-2 text-blue-600 hover:text-blue-700"
              >
                Start a new chat
              </button>
            </div>
          ) : (
            rooms.map(room => (
              <div
                key={room.id}
                onClick={() => handleSelectRoom(room)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedRoom?.id === room.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <img
                    src={getRoomAvatar(room)}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 truncate">
                        {getRoomDisplayName(room)}
                      </h3>
                      {room.last_message && (
                        <span className="text-xs text-gray-500">
                          {formatTime(room.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    {room.last_message && (
                      <p className="text-sm text-gray-600 truncate">
                        {room.last_message.content}
                      </p>
                    )}
                    {room.unread_count > 0 && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-white bg-blue-600 rounded-full">
                        {room.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* User List Overlay */}
      {showUserList && (
        <div className="absolute inset-0 bg-white z-10 md:relative md:w-80 md:border-r md:border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">New Chat</h2>
              <button
                onClick={() => setShowUserList(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Search users..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="overflow-y-auto h-full">
            {accessibleUsers.map(user => (
              <div
                key={user.user_id}
                onClick={() => handleStartChat(user)}
                className="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={user.profile_image || '/default-avatar.png'}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{user.full_name}</h3>
                    <p className="text-sm text-gray-600">
                      {user.designation || user.role}
                      {user.department_name && ` • ${user.department_name}`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <img
                  src={getRoomAvatar(selectedRoom)}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-medium text-gray-900">
                    {getRoomDisplayName(selectedRoom)}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedRoom.other_members?.map(m => m.role).join(', ')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Video className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center items-center h-full text-gray-500">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwn = message.sender_id === currentUser.id;
                  const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-end space-x-2 max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        {showAvatar && !isOwn && (
                          <img
                            src={message.sender_image || '/default-avatar.png'}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        )}
                        {!showAvatar && !isOwn && <div className="w-8" />}
                        
                        <div>
                          {showAvatar && !isOwn && (
                            <p className="text-xs text-gray-600 mb-1 ml-2">
                              {message.sender_name}
                            </p>
                          )}
                          <div
                            className={`px-4 py-2 rounded-2xl ${
                              isOwn
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-900 border border-gray-200'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                          </div>
                          <p className={`text-xs text-gray-500 mt-1 ${isOwn ? 'text-right mr-2' : 'ml-2'}`}>
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Paperclip className="w-5 h-5 text-gray-600" />
                </button>
                
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p>Choose a conversation from the list or start a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
