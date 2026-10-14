// frontend/src/pages/admin/AdminMessenger.jsx
import React, { useState, useEffect } from 'react';
import AdminChatsList from '../../components/admin/messenger/AdminChatsList';
import AdminChatWindow from '../../components/admin/messenger/AdminChatWindow';
import AdminNewChatModal from '../../components/admin/messenger/AdminNewChatModal';

export default function AdminMessenger() {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelectChat = (conversation) => {
    setSelectedConversation(conversation);
  };

  const handleBack = () => {
    setSelectedConversation(null);
  };

  const handleChatStart = (conversation) => {
    setSelectedConversation(conversation);
    setShowNewChat(false);
  };

  return (
    <div className="admin-messenger-container">
      <div className={`chats-sidebar ${selectedConversation && isMobile ? 'hidden' : ''}`}>
        <AdminChatsList 
          onSelectChat={handleSelectChat} 
          onNewChat={() => setShowNewChat(true)} 
        />
      </div>

      <div className={`chat-window-container ${!selectedConversation && isMobile ? 'hidden' : ''}`}>
        {selectedConversation ? (
          <AdminChatWindow 
            conversation={selectedConversation} 
            onBack={handleBack}
            onOpenInfo={() => setShowInfoDrawer(true)}
          />
        ) : (
          <div className="no-chat-selected">
            <div className="no-chat-content">
              <div className="logo">💬</div>
              <h3>ZUCA Messenger Admin</h3>
              <p>Select a conversation to start monitoring</p>
            </div>
          </div>
        )}
      </div>

      {showNewChat && (
        <AdminNewChatModal 
          onClose={() => setShowNewChat(false)} 
          onChatStart={handleChatStart}
        />
      )}

      <style jsx>{`
        .admin-messenger-container {
          display: flex;
          height: calc(100vh - 60px);
          background: #FFFFFF;
          overflow: hidden;
        }

        .chats-sidebar {
          width: 380px;
          border-right: 1px solid #E9EDEF;
          background: #FFFFFF;
          flex-shrink: 0;
        }

        .chat-window-container {
          flex: 1;
          background: #ECE5DD;
        }

        .no-chat-selected {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ECE5DD;
        }

        .no-chat-content {
          text-align: center;
        }

        .no-chat-content .logo {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .no-chat-content h3 {
          font-size: 20px;
          color: #111B21;
          margin-bottom: 8px;
        }

        .no-chat-content p {
          color: #667781;
        }

        @media (max-width: 768px) {
          .chats-sidebar {
            width: 100%;
          }
          
          .chats-sidebar.hidden {
            display: none;
          }
          
          .chat-window-container.hidden {
            display: none;
          }
          
          .chat-window-container {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}