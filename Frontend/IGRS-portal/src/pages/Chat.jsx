import React, { useState, useRef, useEffect } from "react";
import { 
  Search, Users, Send, Phone, Video, MoreVertical, 
  Paperclip, Smile, Mic, MicOff, Archive, Star,
  Clock, Check, CheckCheck, Pin, Hash, Settings,
  Filter, SortAsc, MoreHorizontal, UserPlus, Shield,
  ChevronDown, ChevronRight, MessageCircle, User, Crown,
  Building2, MapPin, Calendar, AlertCircle, CheckCircle,
  XCircle, Clock as ClockIcon, Globe, Mail, Phone as PhoneIcon
} from "lucide-react";
import conversationsData from '../data/officials/conversations.json';

function Chat() {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [activeTab, setActiveTab] = useState("officials");
  const [expandedTabs, setExpandedTabs] = useState({
    officials: true,
    citizens: true,
    departmentHeads: true
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  // Extract data from conversations.json with error handling
  const conversations = conversationsData?.conversations || [];

  // Announcements and related datasets removed

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Categorize conversations by participant roles
  const categorizeConversations = () => {
    const officials = [];
    const citizens = [];
    const departmentHeads = [];

    // Add safety check for conversations array
    if (!conversations || !Array.isArray(conversations)) {
      return { officials, citizens, departmentHeads };
    }

    conversations.forEach(conv => {
      // Add safety checks for each conversation
      if (!conv || !conv.participants || !Array.isArray(conv.participants)) {
        return;
      }
      
      const participants = conv.participants;
      const messages = conv.messages || [];
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      
      participants.forEach(participant => {
        if (participant.role === "Citizen") {
          const otherParticipant = participants.find(p => p.role !== "Citizen");
          if (!citizens.find(c => c.name === participant.name)) {
            citizens.push({
              ...participant,
              chatId: conv.chat_id || 'unknown',
              lastMessage: lastMessage?.text || "No messages",
              lastTime: lastMessage?.time || new Date().toISOString(),
              otherParticipant: otherParticipant,
              unreadCount: Math.floor(Math.random() * 5)
            });
          }
        } else if (participant.role === "Department Head" || participant.role === "District Collector") {
          const otherParticipant = participants.find(p => p.role !== participant.role);
          if (!departmentHeads.find(dh => dh.name === participant.name)) {
            departmentHeads.push({
              ...participant,
              chatId: conv.chat_id || 'unknown',
              lastMessage: lastMessage?.text || "No messages",
              lastTime: lastMessage?.time || new Date().toISOString(),
              otherParticipant: otherParticipant,
              unreadCount: Math.floor(Math.random() * 3)
            });
          }
        } else if (participant.role.includes("Officer") || participant.role.includes("Inspector") || participant.role.includes("Nagar Sevak")) {
          const otherParticipant = participants.find(p => p.role !== participant.role);
          if (!officials.find(o => o.name === participant.name)) {
            officials.push({
              ...participant,
              chatId: conv.chat_id || 'unknown',
              lastMessage: lastMessage?.text || "No messages",
              lastTime: lastMessage?.time || new Date().toISOString(),
              otherParticipant: otherParticipant,
              unreadCount: Math.floor(Math.random() * 4)
            });
          }
        }
      });
    });

    return { officials, citizens, departmentHeads };
  };

  const { officials, citizens, departmentHeads } = categorizeConversations();

  // Add debug logging to help identify the issue
  console.log('Conversations data:', conversationsData);
  console.log('Conversations array:', conversations);
  console.log('Categorized data:', { officials, citizens, departmentHeads });

  const toggleTab = (tab) => {
    setExpandedTabs(prev => ({
      ...prev,
      [tab]: !prev[tab]
    }));
  };

  const selectConversation = (conversation) => {
    if (!conversation) return;
    
    setSelectedConversation(conversation);
    // Find the actual conversation data
    const conv = conversations.find(c => c && c.chat_id === conversation.chatId);
    setMessages(conv && conv.messages ? conv.messages : []);
  };

  const getRoleIcon = (role) => {
    if (role === "Citizen") return <User className="h-4 w-4" />;
    if (role.includes("Head") || role.includes("Collector")) return <Crown className="h-4 w-4" />;
    if (role.includes("Officer") || role.includes("Inspector")) return <Shield className="h-4 w-4" />;
    return <Building2 className="h-4 w-4" />;
  };

  const getRoleColor = (role) => {
    if (role === "Citizen") return "bg-blue-100 text-blue-800 border-blue-200";
    if (role.includes("Head") || role.includes("Collector")) return "bg-purple-100 text-purple-800 border-purple-200";
    if (role.includes("Officer") || role.includes("Inspector")) return "bg-green-100 text-green-800 border-green-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && selectedConversation) {
      const newMsg = {
        id: Date.now(),
        sender: "You",
        message: newMessage,
        timestamp: new Date().toISOString(),
        type: "text",
        status: "sent"
      };
      setMessages([...messages, newMsg]);
      setNewMessage("");
    }
  };

  // Announcements helper functions
  const openCreateModal = (type) => {
    setCreateModalType(type);
    setFormData({});
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateModalType("");
    setFormData({});
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    console.log(`Creating ${createModalType}:`, formData);
    // Here you would normally send data to backend
    closeCreateModal();
  };

  // Removed tab icon helper for announcements/posts/polls/history

  return (
    <div className="flex h-[calc(100vh-180px)] bg-white overflow-hidden max-h-[calc(100vh-180px)]" style={{height: 'calc(100vh - 180px)', maxHeight: 'calc(100vh - 180px)'}}>
      {/* Left Sidebar - Conversations List */}
      <div className="w-1/3 border-r border-gray-300 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-300 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Conversations</h2>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded pl-10 focus:outline-none focus:border-blue-500"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400 h-4 w-4" />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Conversations List */}
          <>
          {/* Officials Tab */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleTab('officials')}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <Shield className="h-4 w-4 text-gray-600 mr-2" />
                <span className="font-medium text-gray-800">Officials</span>
                <span className="ml-2 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">
                  {officials.length}
                </span>
              </div>
              {expandedTabs.officials ? <ChevronDown className="h-4 w-4 text-gray-600" /> : <ChevronRight className="h-4 w-4 text-gray-600" />}
            </button>
            
            {expandedTabs.officials && (
              <div className="max-h-64 overflow-y-auto">
                {officials.filter(official => 
                  official.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  official.role.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((official) => (
                  <button
                    key={official.name}
                    onClick={() => selectConversation(official)}
                    className={`w-full text-left p-3 hover:bg-gray-50 transition-colors border-l-2 ${
                      selectedConversation?.name === official.name 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                          {official.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{official.name}</h3>
                          <p className="text-sm text-gray-600">{official.role}</p>
                          <p className="text-xs text-gray-500 truncate max-w-40">{official.lastMessage}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{formatTime(official.lastTime)}</p>
                        {official.unreadCount > 0 && (
                          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                            {official.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Citizens Tab */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleTab('citizens')}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <User className="h-4 w-4 text-gray-600 mr-2" />
                <span className="font-medium text-gray-800">Citizens</span>
                <span className="ml-2 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">
                  {citizens.length}
                </span>
              </div>
              {expandedTabs.citizens ? <ChevronDown className="h-4 w-4 text-gray-600" /> : <ChevronRight className="h-4 w-4 text-gray-600" />}
            </button>
            
            {expandedTabs.citizens && (
              <div className="max-h-64 overflow-y-auto">
                {citizens.filter(citizen => 
                  citizen.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  citizen.role.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((citizen) => (
                  <button
                    key={citizen.name}
                    onClick={() => selectConversation(citizen)}
                    className={`w-full text-left p-3 hover:bg-gray-50 transition-colors border-l-2 ${
                      selectedConversation?.name === citizen.name 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                          {citizen.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{citizen.name}</h3>
                          <p className="text-sm text-gray-600">Citizen</p>
                          <p className="text-xs text-gray-500 truncate max-w-40">{citizen.lastMessage}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{formatTime(citizen.lastTime)}</p>
                        {citizen.unreadCount > 0 && (
                          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                            {citizen.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
          ))}
        </div>
            )}
          </div>

          {/* Department Heads Tab */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleTab('departmentHeads')}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <Crown className="h-4 w-4 text-gray-600 mr-2" />
                <span className="font-medium text-gray-800">Department Heads</span>
                <span className="ml-2 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">
                  {departmentHeads.length}
                </span>
              </div>
              {expandedTabs.departmentHeads ? <ChevronDown className="h-4 w-4 text-gray-600" /> : <ChevronRight className="h-4 w-4 text-gray-600" />}
            </button>
            
            {expandedTabs.departmentHeads && (
              <div className="max-h-64 overflow-y-auto">
                {departmentHeads.filter(head => 
                  head.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  head.role.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((head) => (
                  <button
                    key={head.name}
                    onClick={() => selectConversation(head)}
                    className={`w-full text-left p-3 hover:bg-gray-50 transition-colors border-l-2 ${
                      selectedConversation?.name === head.name 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                          {head.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{head.name}</h3>
                          <p className="text-sm text-gray-600">{head.role}</p>
                          <p className="text-xs text-gray-500 truncate max-w-40">{head.lastMessage}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{formatTime(head.lastTime)}</p>
                        {head.unreadCount > 0 && (
                          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                            {head.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
          ))}
              </div>
            )}
          </div>
          </>
        </div>
      </div>

      {/* Right Side - Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Chat Header */}
        {selectedConversation ? (
          <div className="p-4 border-b border-gray-300 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white font-medium">
                  {selectedConversation.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{selectedConversation.name}</h3>
                  <p className="text-sm text-gray-600">{selectedConversation.role}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                  <Phone className="h-4 w-4 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                  <Video className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 border-b border-gray-300 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Select a conversation</h3>
                <p className="text-sm text-gray-600">Choose a contact to start messaging</p>
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 pb-20">
          {selectedConversation && messages.length > 0 ? (
            <>
              {messages.map((msg, index) => (
                <div key={index} className={`mb-4 flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs ${msg.sender === 'You' ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block px-3 py-2 rounded-lg ${
                      msg.sender === 'You' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-900'
                    }`}>
                      <p className="text-sm">{msg.text}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{formatTime(msg.time)}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          ) : selectedConversation ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-600 mb-1">No messages yet</h3>
                <p className="text-gray-500">Start a conversation with {selectedConversation.name}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-600 mb-2">Welcome to Government Chat</h3>
                <p className="text-gray-500">Select a conversation from the sidebar to start messaging</p>
              </div>
            </div>
          )}
        </div>

        {/* Message Input - Fixed at bottom */}
        {selectedConversation && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-300 bg-white">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Message ${selectedConversation.name}...`}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
              >
                <Send className="h-4 w-4 mr-1" />
                Send
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Create Modal removed */}
    </div>
  );
}

export default Chat;