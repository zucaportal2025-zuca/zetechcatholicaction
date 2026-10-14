import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register' // service worker for PWA

// Register the service worker
registerSW({
  immediate: true,
  onRegistered(r) {
    console.log("Service Worker registered!", r)
  },
  onRegisterError(err) {
    console.error("SW registration failed:", err)
  }
})

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "OPEN_URL") {
      console.log("Opening:", event.data.url);
      window.location.href = event.data.url;
    }
  });
}


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)