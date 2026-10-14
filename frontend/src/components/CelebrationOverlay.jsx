// src/components/common/CelebrationOverlay.jsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

const CONFETTI_COLORS = ['#22c55e', '#4ade80', '#16a34a', '#fbbf24', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#15803d'];

const CelebrationOverlay = ({ show, onComplete, userName }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (show) {
      setProgress(0);
      
      // Animate progress bar
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) { clearInterval(interval); return 100; }
          return prev + 1;
        });
      }, 40);

      // Auto-dismiss after 5 seconds — ORIGINAL LOGIC
      const timer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 7000);
      
      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [show, onComplete]);

  if (!show) return null;

  const confettiPieces = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2.5 + Math.random() * 3.5,
    size: 5 + Math.random() * 12,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotation: Math.random() * 720,
    drift: (Math.random() - 0.5) * 300,
    shape: Math.random() > 0.6 ? 'circle' : Math.random() > 0.5 ? 'rectangle' : 'triangle',
  }));

  const name = userName || 'there';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          {/* Pulse rings */}
          {[1, 2, 3].map((ring) => (
            <motion.div
              key={ring}
              initial={{ scale: 0, opacity: 0.6 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 3, delay: ring * 0.6, repeat: Infinity, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                width: 200,
                height: 200,
                borderRadius: '50%',
                border: `2px solid rgba(34, 197, 94, ${0.3 / ring})`,
                pointerEvents: 'none',
              }}
            />
          ))}

          {/* Confetti */}
          <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 100000 }}>
            {confettiPieces.map((c) => (
              <motion.div
                key={c.id}
                initial={{ y: -30, x: 0, rotate: 0, opacity: 1, scale: 1 }}
                animate={{
                  y: '110vh',
                  x: [0, c.drift * 0.5, c.drift, c.drift * 0.3],
                  rotate: [0, c.rotation * 0.4, c.rotation * 0.7, c.rotation],
                  opacity: [1, 0.9, 0.5, 0],
                  scale: [1, 1.1, 0.8, 0.2],
                }}
                transition={{ duration: c.duration, delay: c.delay, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  left: `${c.left}%`,
                  top: -20,
                  width: c.size,
                  height: c.shape === 'rectangle' ? c.size * 0.5 : c.size,
                  backgroundColor: c.shape !== 'triangle' ? c.color : 'transparent',
                  borderBottom: c.shape === 'triangle' ? `${c.size}px solid ${c.color}` : 'none',
                  borderLeft: c.shape === 'triangle' ? `${c.size / 2}px solid transparent` : 'none',
                  borderRight: c.shape === 'triangle' ? `${c.size / 2}px solid transparent` : 'none',
                  borderRadius: c.shape === 'circle' ? '50%' : c.shape === 'rectangle' ? 2 : 0,
                }}
              />
            ))}
          </div>

          {/* Card */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.7, opacity: 0, y: -30 }}
            transition={{ type: 'spring', damping: 10, stiffness: 150, mass: 0.8 }}
            style={{
              textAlign: 'center',
              padding: '50px 40px',
              zIndex: 100001,
              maxWidth: 480,
              width: '90%',
              background: 'rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              borderRadius: 32,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 40px 80px rgba(0, 0, 0, 0.4)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Inner glow */}
            <div style={{
              position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)',
              width: 300, height: 200,
              background: 'radial-gradient(ellipse, rgba(34, 197, 94, 0.1) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            {/* Official CheckCircle */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 7, stiffness: 180, delay: 0.1 }}
              style={{ marginBottom: 28, position: 'relative', display: 'inline-block' }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0.3] }}
                transition={{ duration: 2, delay: 0.5, repeat: Infinity }}
                style={{
                  position: 'absolute', inset: -24, borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(34, 197, 94, 0.5) 0%, transparent 70%)',
                }}
              />
              <CheckCircle size={110} color="#22c55e" strokeWidth={2} fill="white" />
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{
                fontSize: 'clamp(28px, 6vw, 48px)',
                fontWeight: 900,
                margin: '0 0 8px',
                letterSpacing: -1,
                color: '#22c55e',
              }}
            >
              CHECKED IN
            </motion.h2>

            <motion.p
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{ fontSize: 'clamp(15px, 2.5vw, 18px)', color: '#d4d4d4', margin: '0 0 6px', fontWeight: 400 }}
            >
              Welcome, <span style={{ color: '#22c55e', fontWeight: 700 }}>{name}</span>!
            </motion.p>

            <motion.p
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.55 }}
              style={{ fontSize: 'clamp(13px, 2vw, 15px)', color: '#a3a3a3', margin: '0 0 32px', fontWeight: 400 }}
            >
              Your attendance has been recorded successfully.
            </motion.p>

            {/* Status cards */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}
            >
              {[
                { label: 'Status', value: 'Present', color: '#22c55e' },
                { label: 'Time', value: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), color: '#3b82f6' },
                { label: 'Date', value: new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }), color: '#8b5cf6' },
              ].map((item, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', borderRadius: 12, padding: '10px 16px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', minWidth: 90 }}>
                  <div style={{ fontSize: 10, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </motion.div>

            {/* Active Progress Bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', borderRadius: 16, padding: '14px 20px', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ height: '100%', width: `${progress}%`, background: '#22c55e', borderRadius: 10, transition: 'width 0.04s linear' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>ATTENDANCE CONFIRMED</span>
                <span style={{ color: '#a3a3a3', fontSize: 10, fontWeight: 600 }}>{progress}%</span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CelebrationOverlay;