import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import SEO from "./components/SEO";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import BASE_URL from "./api";
import './index.css'

// Import Notification Manager and Badge Manager
import badgeManager from "./utils/badgeManager";
import pushService from "./services/pushService";

// Import AI Assistants
import ZucaAIAssistant from "./components/ZucaAIAssistant";
import AdminAIAssistant from "./components/AdminAIAssistant";
import TreasurerNotes from './pages/treasurer/TreasurerNotes';
import Layout from "./components/Layout";
import 'react-image-crop/dist/ReactCrop.css';
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import RoleRoute from "./components/RoleRoute";
import JumuiaRoute from "./components/routing/JumuiaRoute";
import Landing2 from "./pages/landing2";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Announcements from "./pages/Announcements";
import MassPrograms from "./pages/MassPrograms";
import Contributions from "./pages/Contributions";
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import HymnBook from './pages/HymnBook';
import HymnLyrics from './pages/HymnLyrics';
import LiturgicalCalendar from './pages/LiturgicalCalendar';
import JumuiaDashboard from "./pages/JumuiaDashboard";
import JoinJumuia from "./pages/JoinJumuia";
import JumuiaDetailPage from "./pages/jumuia/JumuiaDetailPage";
import FullReadings from './pages/FullReadings';
import GalleryPage from "./pages/gallery";
import Landing from "./pages/Landing";
import UserManual from './pages/UserManual';
import Games from "./pages/Games";
import UserSchedules from "./pages/UserSchedules";
import UserYoutubeHub from "./pages/UserYoutubeHub";
import Prayer from "./pages/Prayer";
import PaymentPage from "./pages/PaymentPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import MessengerPage from './pages/MessengerPage';
import { MessengerProvider } from './contexts/MessengerContext';
import MemberAttendance from './pages/member/MemberAttendance';
import MemberAttendanceHistory from './pages/member/MemberAttendanceHistory';
import LinkCheckin from './components/admin/attendance/LinkCheckin';
import MinutesList from './pages/admin/minutes/MinutesList';
import MinutesViewPage from './pages/admin/minutes/MinutesViewPage';
import ScanPage from './pages/ScanPage';
import BankPayments from "./pages/BankPayments";
import UpdateNotification from './components/UpdateNotification';
import MassReadingsPage from './pages/MassReadingsPage';
import MassReadingDetail from './pages/MassReadingDetail';
import MassReadingUpload from './pages/MassReadingUpload'
import MassReadingEdit from './pages/MassReadingEdit';
import FloatingAIAssistantButton from "./components/FloatingAIAssistantButton";
import ExecutiveMinutes from './pages/ExecutiveMinutes';
import ExecutiveMinutesView from './pages/ExecutiveMinutesView';
import Feedback from './pages/Feedback';
import FeedbackHistory from './pages/FeedbackHistory';
import FeedbackDetail from './pages/FeedbackDetail';

// GAMES
import TicTacToe from "./pages/games/TicTacToe";
import Snake from "./pages/games/Snake";
import BibleTrivia from "./pages/games/BibleTrivia";
import Chess from "./pages/games/Chess";


// ===== EXECUTIVE SYSTEM IMPORTS =====
import ExecutivePage from "./pages/ExecutivePage";
import AdminExecutivePage from "./pages/admin/AdminExecutivePage";

/* ===== ADMIN IMPORTS ===== */
import AdminLayout from "./pages/admin/AdminLayout";
import AdminHealthCentre from './pages/admin/AdminHealthCentre';
import AdminHistory from './pages/admin/AdminHistory';
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMediaPage from "./pages/admin/MediaPage";
import UsersPage from "./pages/admin/UsersPage";
import RoleManagement from "./pages/admin/RoleManagement";
import ActivityPage from "./pages/admin/ActivityPage";
import YoutubeAnalyticsPage from './pages/admin/YoutubeAnalyticsPage';
import SongsPage from "./pages/admin/SongsPage";
import AdminHymns from './pages/admin/Hymns';
import AnnouncementsPage from "./pages/admin/AnnouncementsPage";
import ContributionsPage from "./pages/admin/ContributionsPage";
import JumuiaManagement from "./pages/admin/JumuiaManagement";
import ChatMonitorPage from "./pages/admin/ChatMonitorPage";
import SecurityPage from "./pages/admin/SecurityPage";
import PendingSongs from "./pages/admin/PendingSongs";
import OCRScannerPage from "./pages/admin/OCRScanner";
import AddHymn from './pages/admin/AddHymn';
import AdminSchedules from "./pages/admin/AdminSchedules";
import AdminMessenger from './pages/admin/AdminMessenger';
import AdminAttendance from './components/admin/attendance/AdminAttendance';
import AdminAttendanceDetails from './pages/admin/AdminAttendanceDetails';
import AdminPrayers from './pages/admin/AdminPrayers';
import MinutesCreatePage from './pages/admin/minutes/MinutesCreatePage';
import MinutesEditPage from './pages/admin/minutes/MinutesEditPage';
import TreasurerReports from './pages/treasurer/TreasurerReports';
import AddMemberPage from './pages/admin/attendance/AddMemberPage';
import AdminAttendanceOverview from './pages/admin/attendance/AdminAttendanceOverview';
import AdminMemberDetail from './pages/admin/attendance/AdminMemberDetail';
import EmailManagement from './pages/admin/EmailManagement';
import EmailDashboard from "./pages/admin/EmailDashboard";
import WhatsAppBot from './pages/admin/WhatsAppBot';
import MessageHistory from './pages/admin/MessageHistory';
import AdminFeedback from './pages/admin/AdminFeedback';
import AdminFeedbackDetail from './pages/admin/AdminFeedbackDetail';
import CountdownSettings from './pages/admin/CountdownSettings';
import Advertisements from "./pages/admin/Advertisements";


import { initializeDark } from "./utils/darkReader";




/* ===== ROLE LAYOUT ===== */
import RoleLayout from "./pages/role/RoleLayout";

// Create socket instance with better configuration
const socket = io(BASE_URL, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

// Create a wrapper component that has access to navigate
function AppContent() {
  const navigate = useNavigate();
  const [showAI, setShowAI] = useState(false);
  const [isAIFullPage, setIsAIFullPage] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  // ✅ SERVICE WORKER UPDATE DETECTION - SILENT MODE (no user distraction)
useEffect(() => {
  if ('serviceWorker' in navigator) {
    // Just log silently, no refresh, no notifications
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        // Silently skip waiting - no user interaction
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Silently activate new worker without refreshing
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    });
  }
}, []);

  // Listen for User AI open events
  useEffect(() => {
    const handleOpenUserAI = (event) => {
      console.log("👤 Opening User AI");
      setShowAI(true);
      setIsAIFullPage(event.detail?.fullPage || true);
    };
    window.addEventListener('openZUCAI', handleOpenUserAI);
    
    const user = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(user);
    
    return () => window.removeEventListener('openZUCAI', handleOpenUserAI);
  }, []);

  // Listen for Admin AI open events
  useEffect(() => {
    const handleOpenAdminAI = (event) => {
      console.log("👑 Opening Admin AI");
      setShowAI(true);
      setIsAIFullPage(event.detail?.fullPage || true);
    };
    window.addEventListener('openAdminAI', handleOpenAdminAI);
    
    return () => window.removeEventListener('openAdminAI', handleOpenAdminAI);
  }, []);

  // Update user when storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const user = JSON.parse(localStorage.getItem('user'));
      setCurrentUser(user);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Socket.IO connection setup with FCM compatibility
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        socket.emit("join", userData.id);
        console.log("📡 Joined socket room for user:", userData.id);
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
    
    socket.on("new_notification", (notification) => {
      console.log("🔔 New notification received:", notification);
      
      // Increment badge count
      badgeManager.increment();
      
      // Show in-app toast if available
      if (window.showInAppToast) {
        window.showInAppToast({
          title: notification.title || "New Notification",
          message: notification.message,
          body: notification.message,
          type: notification.type,
          id: notification.id,
          entityId: notification.entityId,
          createdAt: notification.createdAt,
          data: notification.data
        });
      }
      
      // Show browser notification if permitted and tab is hidden
      if (Notification.permission === "granted" && document.hidden) {
        // For FCM compatibility on Android, ensure proper notification format
        const notificationOptions = {
          body: notification.message,
          icon: "/android-chrome-192x192.png",
          badge: "/badge-icon.png",
          tag: notification.id || `notif-${Date.now()}`,
          vibrate: [200, 100, 200],
          requireInteraction: notification.type === 'game_invite' || notification.type === 'event_reminder',
          renotify: true,
              data: {
      url: notification.data?.url || 
           (notification.type === 'attendance_reminder' ? '/member/attendance' :
            notification.type === 'game_invite' ? '/games' :
            notification.type === 'event_reminder' ? '/mass-programs' :
            notification.type === 'announcement' ? '/announcements' :
            notification.type === 'message' ? '/messenger' :
            notification.type === 'contribution_reminder' ? '/contributions' :
            '/dashboard'),
      id: notification.id,
      type: notification.type,
      entityId: notification.entityId,
      timestamp: Date.now()
    },
          actions: []
        };
        
        // Add action buttons based on notification type
        if (notification.type === 'game_invite') {
          notificationOptions.actions = [
            { action: 'accept', title: '🎮 Accept' },
            { action: 'decline', title: '❌ Decline' }
          ];
        } else if (notification.type === 'pledge_approved' || notification.type === 'payment_added') {
          notificationOptions.actions = [
            { action: 'view', title: '💰 View Pledge' },
            { action: 'dismiss', title: 'Dismiss' }
          ];
        } else if (notification.type === 'event_reminder') {
          notificationOptions.actions = [
            { action: 'view', title: '📅 View Event' },
            { action: 'dismiss', title: 'Dismiss' }
          ];
        } else {
          notificationOptions.actions = [
            { action: 'view', title: '📖 View Details' },
            { action: 'dismiss', title: 'Dismiss' }
          ];
        }
        
        new Notification(notification.title || "New Notification", notificationOptions);
      }
    });
    
    socket.on("new_notification_batch", (notifications) => {
      console.log("📦 Batch notifications received:", notifications?.length);
      badgeManager.loadCount();
    });

     socket.on("minutes_published", (data) => {
    console.log("📋 New minutes published:", data);
    badgeManager.increment();
    
    if (window.showInAppToast) {
      window.showInAppToast({
        title: "📋 New Minutes Published",
        message: data.title,
        type: "minutes",
        data: { minutesId: data.id }
      });
    }
  });
    
    // Listen for FCM subscription refresh events
    socket.on("push_subscription_refresh", async (data) => {
      console.log("🔄 Push subscription refresh requested:", data);
      if (data.reason === 'expired' || data.reason === 'migration') {
        await pushService.unsubscribe();
        await pushService.subscribe();
      }
    });


    
        // ===== GLOBAL CHESS INVITE LISTENER =====
    socket.on("chess_invite_received", (data) => {
      console.log("📨 Chess invite received:", data);
      
      if (window.confirm(`♟️ ${data.fromName} challenged you to Chess!\n\nAccept?`)) {
        sessionStorage.setItem("chess_invite", JSON.stringify(data));
        window.location.href = "/games/chess";
      }
    });

   
    return () => {
      socket.off("new_notification");
      socket.off("new_notification_batch");
       socket.off("minutes_published");
      socket.off("push_subscription_refresh");
      socket.off("chess_invite_received");
    };
  }, []);
  
  // Initialize push notifications with FCM compatibility
  useEffect(() => {
    const initPushNotifications = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          await pushService.init();
          await pushService.registerServiceWorker();
          const permission = await pushService.requestPermission();
          
          if (permission) {
            const subscribed = await pushService.subscribe();
            if (subscribed) {
              setPushEnabled(true);
              console.log("✅ Push notifications enabled successfully");
            }
          } else {
            console.log("⚠️ Notification permission not granted");
          }
          await badgeManager.loadCount();
        } catch (err) {
          console.error("Failed to initialize push notifications:", err);
        }
      }
    };
    initPushNotifications();
  }, []);
  
  // Handle service worker messages (for FCM)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('📨 Message from service worker:', event.data);
        
        const { type, data } = event.data || {};
        
        // Handle game invite accept/decline from notification actions
        if (type === 'GAME_INVITE_ACCEPTED') {
          window.dispatchEvent(new CustomEvent('acceptGameInvite', { detail: data }));
        }
        
        if (type === 'GAME_INVITE_DECLINED') {
          window.dispatchEvent(new CustomEvent('declineGameInvite', { detail: data }));
        }
        
        // Handle pledge payment from notification actions
        if (type === 'PLEDGE_PAYMENT') {
          window.dispatchEvent(new CustomEvent('openPledgePayment', { detail: data }));
        }
      });
    }
  }, []);
  
  // Listen for user login/logout events
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem("token");
      const user = localStorage.getItem("user");
      
      if (token && user) {
        try {
          const userData = JSON.parse(user);
          socket.emit("join", userData.id);
          pushService.setupForUser(); // Use enhanced setup
          badgeManager.loadCount();
          setCurrentUser(userData);
        } catch (e) {}
      } else {
        socket.emit("leave-all");
        pushService.unsubscribe();
        badgeManager.updateBadgeCount(0);
        setCurrentUser(null);
        setPushEnabled(false);
      }
    };
    
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Check if user is admin
  const isAdmin = currentUser?.role === "admin" || 
                 currentUser?.specialRole === "admin" ||
                  currentUser?.specialRole === "secretary" || 
                  currentUser?.specialRole === "treasurer";

  return (
    <>
            <SEO />

      <Routes>
        <Route path="/treasurer/notes" element={<TreasurerNotes />} />
                  <Route path="/treasurer/reports" element={<TreasurerReports />} />

        {/* ================= LANDING PAGE ================= */}
        <Route path="/" element={<Landing2 />} />
        
        {/* ================= PUBLIC ROUTES ================= */}
        <Route path="/home" element={<Home />} />
        <Route path="/readings/:date" element={<FullReadings />} />
        <Route path="/liturgical-calendar" element={<LiturgicalCalendar />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/prayer" element={<Prayer />} />
        <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/gallery/:id" element={<GalleryPage />} />

        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/user-manual" element={<UserManual />} />
        <Route path="/pay/:slug" element={<PaymentPage />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/pay/campaign/:campaignId" element={<PaymentPage />} /> 
                  <Route path="/attendance/link/:token" element={<LinkCheckin />} />
                  <Route path="/scan/:token" element={<ScanPage />} />
                   <Route path="/hymns" element={<HymnBook />} />
          <Route path="/hymn/:id" element={<HymnLyrics />} />

         
           

        
        {/* ================= EXECUTIVE SYSTEM - PUBLIC VIEW ================= */}

        {/* ================= MEMBER PORTAL ================= */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="member/attendance" element={<MemberAttendance />} />
          <Route path="member/attendance-history" element={<MemberAttendanceHistory />} />
          
          <Route path="/mass-programs" element={<MassPrograms />} />
          <Route path="/contributions" element={<Contributions />} />
          <Route path="/jumuia-contributions" element={<JumuiaDashboard />} /> 
          <Route path="/join-jumuia" element={<JoinJumuia />} />
          <Route path="/hymns" element={<HymnBook />} />
          <Route path="/hymn/:id" element={<HymnLyrics />} />
          <Route path="/chat" element={<Chat />} />
           <Route path="/messenger" element={<MessengerPage />} />  
          <Route path="/games" element={<Games />} />
          <Route path="/schedules" element={<UserSchedules />} />
          <Route path="/youtube" element={<UserYoutubeHub />} />
                  <Route path="/executive" element={<ExecutivePage />} />
                  <Route path="/feedback" element={<Feedback />} />
<Route path="/feedback/history" element={<FeedbackHistory />} />
<Route path="/feedback/:id" element={<FeedbackDetail />} />

          

{/* MASS READINGS */}
          <Route path="/mass-readings" element={<MassReadingsPage />} />
<Route path="/mass-readings/:id" element={<MassReadingDetail />} />
<Route path="/mass-readings/upload" element={<MassReadingUpload />} />
<Route path="/mass-readings/edit/:id" element={<MassReadingEdit />} />

 <Route 
  path="/executive/minutes" 
  element={<ExecutiveMinutes />} 
/>
<Route path="/executive/minutes/:id" element={<ExecutiveMinutesView />} />
      

          {/* GAMES */}
          <Route path="/games/tictactoe" element={<TicTacToe />} />
          <Route path="/games/snake" element={<Snake />} />
          <Route path="/games/trivia" element={<BibleTrivia />} />
          <Route path="/games/chess" element={<Chess />} />
           <Route path="/minutes" element={<MinutesList />} />
        </Route>

        {/* ================= JUMUIA DETAIL PAGE ================= */}
        <Route
          path="/jumuia/:jumuiaCode"
          element={
            <ProtectedRoute>
              <JumuiaRoute>
                <JumuiaDetailPage />
              </JumuiaRoute>
            </ProtectedRoute>
          }
        />

        {/* ================= ADMIN PORTAL ================= */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="messenger" element={<AdminMessenger />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="/admin/analytics" element={<YoutubeAnalyticsPage />} />
          <Route path="minutes" element={<MinutesList />} />
          <Route path="songs" element={<SongsPage />} />
          <Route path="/admin/hymns" element={<AdminHymns />} />
          <Route path="/admin/hymns/edit/:id" element={<AddHymn />} />
          <Route path="roles" element={<RoleManagement />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="contributions" element={<ContributionsPage />} />
          <Route path="jumuia-management" element={<JumuiaManagement />} />
          <Route path="/admin/schedules" element={<AdminSchedules />} />
          <Route path="chat" element={<ChatMonitorPage />} />
          <Route path="security" element={<SecurityPage />} />
          <Route path="media" element={<AdminMediaPage />} />
          <Route path="/admin/hymns/add" element={<AddHymn />} /> 
          <Route path="/admin/hymns/edit/:id" element={<AddHymn />} />
          <Route path="/admin/pending-songs" element={<PendingSongs />} />
          <Route path="/admin/ocr-scanner" element={<OCRScannerPage />} />
          <Route path="/admin/health-centre" element={<AdminHealthCentre />} />
          <Route path="/admin/messenger" element={<AdminMessenger />} />
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="attendance/sheet/:sheetId" element={<AdminAttendanceDetails />} />
            <Route path="minutes/:id" element={<MinutesViewPage />} />
          <Route path="/admin/prayers" element={<AdminPrayers />} />
          <Route path="minutes/create" element={<MinutesCreatePage />} />
          <Route path="minutes/edit/:id" element={<MinutesEditPage />} />
          <Route path="/admin/history" element={<AdminHistory />} />
          <Route path="/admin/attendance/add-member/:sheetId" element={<AddMemberPage />} />
          <Route path="/admin/attendance/overview" element={<AdminAttendanceOverview />} />
          <Route path="attendance/member/:userId" element={<AdminMemberDetail />} />
          <Route path="email-settings" element={<EmailManagement />} />
          <Route path="bank-payments" element={<BankPayments />} />
          <Route path="/admin/email" element={<EmailDashboard />} />
          <Route path="/admin/whatsapp" element={<WhatsAppBot />} />
          <Route path="/admin/message-history" element={<MessageHistory />} />
       

<Route path="/admin/feedback" element={<AdminFeedback />} />
<Route path="/admin/feedback/:id" element={<AdminFeedbackDetail />} />
<Route path="/admin/countdown-settings" element={<CountdownSettings />} />
<Route
  path="/admin/advertisements"
  element={<Advertisements />}
/>




          
          {/* ===== EXECUTIVE SYSTEM - ADMIN ROUTES ===== */}
          <Route path="executive" element={<AdminExecutivePage />} />
        </Route>

        {/* ================= SECRETARY ================= */}
        <Route
          path="/secretary"
          element={
            <RoleRoute allowedRoles={["secretary"]}>
              <RoleLayout />
            </RoleRoute>
          }
        >
          <Route index element={<Navigate to="announcements" replace />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="schedules" element={<AdminSchedules />} />
          <Route path="minutes" element={<MinutesList />} />
  <Route path="minutes/:id" element={<MinutesViewPage />} />
  <Route path="minutes/create" element={<MinutesCreatePage />} />
  <Route path="minutes/edit/:id" element={<MinutesEditPage />} />
   <Route path="attendance" element={<AdminAttendance />} />
     <Route path="attendance/sheet/:sheetId" element={<AdminAttendanceDetails />} />
     <Route path="history" element={<AdminHistory />} />
      <Route path="attendance/add-member/:sheetId" element={<AddMemberPage />} />
     
</Route>

        

        {/* ================= TREASURER ================= */}
        <Route
          path="/treasurer"
          element={
            <RoleRoute allowedRoles={["treasurer"]}>
              <RoleLayout />
            </RoleRoute>
          }
        >
          <Route index element={<Navigate to="contributions" replace />} />
          <Route path="contributions" element={<ContributionsPage />} />
          <Route path="reports" element={<TreasurerReports />} />
          <Route path="/treasurer/notes/new" element={<TreasurerNotes />} />
           <Route path="bank-payments" element={<BankPayments />} />
          
        </Route>

        {/* ================= CHOIR MODERATOR ================= */}
        <Route
          path="/choir"
          element={
            <RoleRoute allowedRoles={["choir_moderator"]}>
              <RoleLayout />
            </RoleRoute>
          }
        >
          <Route index element={<Navigate to="songs" replace />} />
          <Route path="songs" element={<SongsPage />} />
           <Route path="hymns" element={<AdminHymns />} />
        </Route>

        {/* ================= JUMUIA LEADER ================= */}
        <Route
          path="/leader"
          element={
            <RoleRoute allowedRoles={["jumuia_leader"]}>
              <RoleLayout />
            </RoleRoute>
          }
        >
          <Route index element={<JumuiaManagement />} />
        </Route>

        {/* ================= MEDIA MODERATOR ================= */}
        <Route
          path="/media-moderator"
          element={
            <RoleRoute allowedRoles={["media_moderator"]}>
              <RoleLayout />
            </RoleRoute>
          }
        >
          <Route index element={<Navigate to="media" replace />} />
          <Route path="media" element={<AdminMediaPage />} />
          <Route path="advertisements" element={<Advertisements />} />
        </Route>

        {/* ================= CATCHi ALL ================= */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

       <UpdateNotification />

      {/* ========== GLOBAL AI OVERLAYi - CHOOSE BASED ON ROLE ========== */}
      {showAI && currentUser && (
        isAdmin ? (
          <AdminAIAssistant 
            user={currentUser}
            onClose={() => { 
              setShowAI(false); 
              setIsAIFullPage(false); 
            }}
            isOpen={showAI}
            isFullPage={isAIFullPage}
            onBack={() => setIsAIFullPage(false)}
            navigate={navigate}
          />
        ) : (
          <ZucaAIAssistant 
            user={currentUser}
            onClose={() => { 
              setShowAI(false); 
              setIsAIFullPage(false); 
            }}
            isOpen={showAI}
            isFullPage={isAIFullPage}
            onBack={() => setIsAIFullPage(false)}
            navigate={navigate}
          />
        )
      )}

        {/* ========== FLOATING AI BUTTON - UNIVERSAL ========== */}
    {currentUser && (
      <FloatingAIAssistantButton 
        user={currentUser} 
        onOpenAI={() => {
          setShowAI(true);
          setIsAIFullPage(false);
        }}
      />
    )}
    </>
  );
}


function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

   useEffect(() => {
    initializeDark();
  }, []);
  
  useEffect(() => {
    const checkUserRole = () => {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      setIsAdmin(currentUser.role === 'admin');
      setLoading(false);
    };
    
    checkUserRole();
    
    // Listen for login/logout changes
    window.addEventListener('storage', checkUserRole);
    return () => window.removeEventListener('storage', checkUserRole);
  }, []);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <HelmetProvider>
      <BrowserRouter>
      
        <MessengerProvider>
          <AppContent />
        </MessengerProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}
export default App;