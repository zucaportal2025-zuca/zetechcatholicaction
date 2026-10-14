import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMessenger } from '../contexts/MessengerContext';
import ChatsList from '../components/messenger/ChatsList';
import ChatWindow from '../components/messenger/ChatWindow';
import NewChatModal from '../components/messenger/NewChatModal';
import ChatInfoDrawer from '../components/messenger/ChatInfoDrawer';

export default function MessengerPage() {
  const navigate = useNavigate();
  const messengerContext = useMessenger();
  
    // ✅ Add fallback if context is undefined
  if (!messengerContext) {
    return (
      <div className="messenger-loading">
        <div className="loading-spinner"></div>
        <h3>Loading Messenger</h3>
        <p>Please wait...</p>
      </div>
    );
  }
  
  const { 
    user, 
    loading, 
    fetchUser, 
    fetchConversations,
    activeConversation,
    setActiveConversation,
    darkMode,
    setDarkMode 
  } = messengerContext;
  
  const [showNewChat, setShowNewChat] = useState(false);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [mobileView, setMobileView] = useState('list');
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  // Check screen size for responsive layout
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      if (desktop) {
        setMobileView('list');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ===== SKELETON LOADING =====
  if (loading) {
    return (
      <div className={`messenger-page ${darkMode ? 'dark' : ''}`}>
        <div className="desktop-container skeleton-container">
          {/* Left Panel - Chats List Skeleton */}
          <div className="chats-panel skeleton-chats-panel">
            <div className="skeleton-header">
              <div className="skeleton-avatar"></div>
              <div className="skeleton-title"></div>
              <div className="skeleton-actions">
                <div className="skeleton-icon"></div>
                <div className="skeleton-icon"></div>
              </div>
            </div>
            <div className="skeleton-search">
              <div className="skeleton-search-icon"></div>
              <div className="skeleton-search-text"></div>
            </div>
            <div className="skeleton-chats-list">
              <div className="skeleton-chat-item"></div>
              <div className="skeleton-chat-item"></div>
              <div className="skeleton-chat-item"></div>
              <div className="skeleton-chat-item"></div>
              <div className="skeleton-chat-item"></div>
              <div className="skeleton-chat-item"></div>
            </div>
          </div>
          
          {/* Right Panel - Chat Window Skeleton */}
          <div className="chat-panel skeleton-chat-panel">
            <div className="skeleton-chat-header">
              <div className="skeleton-chat-avatar"></div>
              <div className="skeleton-chat-name"></div>
              <div className="skeleton-chat-actions">
                <div className="skeleton-icon"></div>
                <div className="skeleton-icon"></div>
              </div>
            </div>
            <div className="skeleton-messages">
              <div className="skeleton-message received"></div>
              <div className="skeleton-message sent"></div>
              <div className="skeleton-message received"></div>
              <div className="skeleton-message sent"></div>
              <div className="skeleton-message received"></div>
            </div>
            <div className="skeleton-input">
              <div className="skeleton-input-icon"></div>
              <div className="skeleton-input-text"></div>
              <div className="skeleton-input-icon"></div>
            </div>
          </div>
        </div>

        <style>{`
          .skeleton-container {
            display: flex;
            height: 100%;
            width: 100%;
            background: #FFFFFF;
          }

          .skeleton-chats-panel {
            width: 380px;
            flex-shrink: 0;
            background: #FFFFFF;
            border-right: 1px solid #E9EDEF;
            height: 100%;
            display: flex;
            flex-direction: column;
            padding: 0 16px;
          }

          .skeleton-chat-panel {
            flex: 1;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: #ECE5DD;
            padding: 0 16px;
          }

          .skeleton-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 0;
            border-bottom: 1px solid #E9EDEF;
          }

          .skeleton-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-title {
            flex: 1;
            height: 20px;
            border-radius: 6px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            max-width: 150px;
          }

          .skeleton-actions {
            display: flex;
            gap: 8px;
          }

          .skeleton-icon {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-search {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 0;
          }

          .skeleton-search-icon {
            width: 20px;
            height: 20px;
            border-radius: 4px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-search-text {
            flex: 1;
            height: 36px;
            border-radius: 8px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-chats-list {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 8px 0;
            overflow: hidden;
          }

          .skeleton-chat-item {
            height: 70px;
            border-radius: 12px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-chat-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 0;
            border-bottom: 1px solid #E9EDEF;
          }

          .skeleton-chat-avatar {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-chat-name {
            flex: 1;
            height: 22px;
            border-radius: 6px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            max-width: 180px;
          }

          .skeleton-chat-actions {
            display: flex;
            gap: 8px;
          }

          .skeleton-messages {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 20px 0;
            justify-content: center;
          }

          .skeleton-message {
            max-width: 60%;
            height: 40px;
            border-radius: 12px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-message.received {
            align-self: flex-start;
            background: #FFFFFF;
            background: linear-gradient(90deg, #f1f5f9 25%, #f8fafc 50%, #f1f5f9 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-message.sent {
            align-self: flex-end;
            background: #DCF8C6;
            background: linear-gradient(90deg, #d1fae5 25%, #dcfce7 50%, #d1fae5 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-message:first-child { width: 45%; }
          .skeleton-message:nth-child(2) { width: 35%; align-self: flex-end; }
          .skeleton-message:nth-child(3) { width: 55%; }
          .skeleton-message:nth-child(4) { width: 30%; align-self: flex-end; }
          .skeleton-message:nth-child(5) { width: 50%; }

          .skeleton-input {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 0;
            border-top: 1px solid #E9EDEF;
          }

          .skeleton-input-icon {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-input-text {
            flex: 1;
            height: 44px;
            border-radius: 24px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }

          .messenger-page.dark .skeleton-container {
            background: #111B21;
          }

          .messenger-page.dark .skeleton-chats-panel {
            background: #111B21;
            border-right-color: #202C33;
          }

          .messenger-page.dark .skeleton-chat-panel {
            background: #0B141A;
          }

          .messenger-page.dark .skeleton-header {
            border-bottom-color: #202C33;
          }

          .messenger-page.dark .skeleton-chat-header {
            border-bottom-color: #202C33;
          }

          .messenger-page.dark .skeleton-input {
            border-top-color: #202C33;
          }

          .messenger-page.dark .skeleton-message.received {
            background: linear-gradient(90deg, #2a3942 25%, #3a4a53 50%, #2a3942 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }

          .messenger-page.dark .skeleton-message.sent {
            background: linear-gradient(90deg, #005c4b 25%, #007a5e 50%, #005c4b 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }

          .messenger-page.dark .skeleton-avatar,
          .messenger-page.dark .skeleton-title,
          .messenger-page.dark .skeleton-icon,
          .messenger-page.dark .skeleton-search-icon,
          .messenger-page.dark .skeleton-search-text,
          .messenger-page.dark .skeleton-chat-item,
          .messenger-page.dark .skeleton-chat-avatar,
          .messenger-page.dark .skeleton-chat-name,
          .messenger-page.dark .skeleton-input-icon,
          .messenger-page.dark .skeleton-input-text {
            background: linear-gradient(90deg, #2a3942 25%, #3a4a53 50%, #2a3942 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }

          @keyframes shimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }

          @media (max-width: 768px) {
            .skeleton-chats-panel {
              width: 100%;
            }
            .skeleton-chat-panel {
              display: none;
            }
          }
        `}</style>
      </div>
    );
  }

  const handleSelectChat = (conversation) => {
    setActiveConversation(conversation);
    if (!isDesktop) {
      setMobileView('chat');
    }
  };

  const handleBackToList = () => {
    setMobileView('list');
    setShowInfoDrawer(false);
  };

  const handleOpenInfo = () => {
    if (isDesktop) {
      setShowInfoDrawer(true);
    } else {
      setMobileView('info');
    }
  };

  const handleCloseInfo = () => {
    if (isDesktop) {
      setShowInfoDrawer(false);
    } else {
      setMobileView('chat');
    }
  };

  const handleNewChat = () => {
    setShowNewChat(true);
  };

  const handleCloseNewChat = () => {
    setShowNewChat(false);
  };

  const handleChatStarted = (conversation) => {
    setActiveConversation(conversation);
    setShowNewChat(false);
    if (!isDesktop) {
      setMobileView('chat');
    }
  };

  return (
    <div className={`messenger-page ${darkMode ? 'dark' : ''}`}>
      {/* Desktop Layout - Two Panels Side by Side */}
      {isDesktop ? (
        <div className="desktop-container">
          {/* Left Panel - Chats List */}
          <div className="chats-panel">
            <ChatsList 
              onSelectChat={handleSelectChat}
              onNewChat={handleNewChat}
            />
          </div>
          
          {/* Right Panel - Chat Window */}
          <div className="chat-panel">
            <ChatWindow 
              conversation={activeConversation}
              onBack={handleBackToList}
              onOpenInfo={handleOpenInfo}
            />
          </div>
          
          {/* Right Drawer - Chat Info (optional) */}
          {showInfoDrawer && activeConversation && (
            <div className="info-drawer">
              <ChatInfoDrawer 
                conversation={activeConversation}
                onClose={handleCloseInfo}
                onBack={handleBackToList}
              />
            </div>
          )}
        </div>
      ) : (
        /* Mobile Layout - Single Panel with Views */
        <div className="mobile-container">
          {mobileView === 'list' && (
            <ChatsList 
              onSelectChat={handleSelectChat}
              onNewChat={handleNewChat}
            />
          )}
          
          {mobileView === 'chat' && activeConversation && (
            <ChatWindow 
              conversation={activeConversation}
              onBack={handleBackToList}
              onOpenInfo={handleOpenInfo}
            />
          )}
          
          {mobileView === 'info' && activeConversation && (
            <ChatInfoDrawer 
              conversation={activeConversation}
              onClose={handleCloseInfo}
              onBack={handleBackToList}
              isMobile={true}
            />
          )}
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChat && (
        <NewChatModal 
          onClose={handleCloseNewChat}
          onChatStart={handleChatStarted}
        />
      )}

      <style jsx>{`
        .messenger-page {
          height: 90%;
          margin-bottom: 15px;
          background: #ECE5DD;
          overflow: hidden;
        }

        .messenger-loading {
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #075E54;
          color: white;
          gap: 16px;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(255, 255, 255, 0.2);
          border-top-color: #FFFFFF;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .messenger-loading h3 {
          font-size: 20px;
          font-weight: 500;
        }

        .messenger-loading p {
          font-size: 14px;
          opacity: 0.8;
        }

        .desktop-container {
          display: flex;
          height: 100%;
          width: 100%;
        }

        .chats-panel {
          width: 380px;
          flex-shrink: 0;
          background: #FFFFFF;
          border-right: 1px solid #E9EDEF;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .chat-panel {
          flex: 1;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .info-drawer {
          width: 320px;
          flex-shrink: 0;
          background: #FFFFFF;
          border-left: 1px solid #E9EDEF;
          height: 100%;
          overflow-y: auto;
        }

        .mobile-container {
          height: 100%;
          width: 100%;
        }

        .messenger-page.dark {
          background: #111B21;
        }

        .messenger-page.dark .chats-panel {
          background: #111B21;
          border-right-color: #202C33;
        }

        .messenger-page.dark .info-drawer {
          background: #111B21;
          border-left-color: #202C33;
        }

        @media (max-width: 1024px) {
          .chats-panel {
            width: 320px;
          }
          .info-drawer {
            width: 280px;
          }
        }

        @media (max-width: 768px) {
          .chats-panel {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}