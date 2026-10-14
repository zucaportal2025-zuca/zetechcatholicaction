// frontend/src/components/FloatingAIAssistantButton.jsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes } from "react-icons/fa";
import logoImg from "../assets/zuca-logo.png";

const FloatingAIAssistantButton = ({ user, onOpenAI }) => {
  const [position, setPosition] = useState(() => {
    return { x: window.innerWidth - 85, y: window.innerHeight - 120 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef(null);

  // Load saved position
  useEffect(() => {
    const savedPosition = localStorage.getItem('ai_button_position');
    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        const maxX = window.innerWidth - 65;
        const maxY = window.innerHeight - 65;
        setPosition({
          x: Math.min(Math.max(pos.x, 0), maxX),
          y: Math.min(Math.max(pos.y, 0), maxY)
        });
      } catch (e) {}
    }
  }, []);

  // Save position
  useEffect(() => {
    if (position.x !== 0 || position.y !== 0) {
      localStorage.setItem('ai_button_position', JSON.stringify(position));
    }
  }, [position]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const maxX = window.innerWidth - 65;
      const maxY = window.innerHeight - 65;
      setPosition(prev => ({
        x: Math.min(prev.x, maxX),
        y: Math.min(prev.y, maxY)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDragStart = (e) => {
    e.preventDefault();
    setHasMoved(false);
    const touch = e.touches ? e.touches[0] : e;
    const rect = buttonRef.current.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
    setIsDragging(true);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    setHasMoved(true);
    const touch = e.touches ? e.touches[0] : e;
    let newX = touch.clientX - dragOffset.x;
    let newY = touch.clientY - dragOffset.y;
    
    const buttonSize = 60;
    const maxX = window.innerWidth - buttonSize;
    const maxY = window.innerHeight - buttonSize;
    
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));
    
    setPosition({ x: newX, y: newY });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging]);

  const handleClick = (e) => {
    if (!hasMoved) {
      window.dispatchEvent(new CustomEvent('openZUCAI', { 
        detail: { fullPage: false } 
      }));
    }
    setHasMoved(false);
  };

  if (!user) return null;

  // Wave colors - ZUCA themed
  const waveColors = [
    'rgba(82, 197, 5, 0.97)',
    'rgba(89, 207, 10, 0.91)',
   
    
  ];

  return (
    <>
      {/* Sound Wave Rings - Positioned around the button */}
      <div
        style={{
          position: "fixed",
          left: `${position.x + 30}px`,
          top: `${position.y + 30}px`,
          zIndex: 99998,
          pointerEvents: "none",
          transform: "translate(-50%, -50%)",
        }}
      >
        {waveColors.map((color, index) => (
          <div
            key={index}
            className="wave-ring"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: `${60 + (index + 1) * 20}px`,
              height: `${60 + (index + 1) * 20}px`,
              borderRadius: "50%",
              border: `2px solid ${color}`,
              animationDelay: `${index * 0.3}s`,
              opacity: 0,
              pointerEvents: "none",
            }}
          />
        ))}
      </div>

      {/* Main Button */}
      <motion.button
        ref={buttonRef}
        onClick={handleClick}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 99999,
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: isHovered 
            ? "linear-gradient(135deg, #fdfdfd, #ffffff)" 
            : "linear-gsradient(135deg, #f8f8f8, #9f1cb9)",
          border: "3px solid rgb(27, 167, 8)",
          boxShadow: isHovered 
          ,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: "none",
          touchAction: "none",
          transition: "all 0.3s ease",
          padding: "8px",
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 15 }}
      >
        <img 
          src={logoImg} 
          alt="ZUCA AI" 
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transition: "transform 0.3s ease",
            borderRadius: "50%",
          }}
        />
        
        {/* Pulse animation ring - Gold */}
        <div style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          border: "2px solid rgba(255, 215, 0, 0.3)",
          animation: "pulse-ring-gold 2s ease-out infinite",
          pointerEvents: "none",
        }} />
        
        {/* Small status dot */}
        <div style={{
          position: "absolute",
          bottom: "2px",
          right: "2px",
          width: "14px",
          height: "14px",
          borderRadius: "50%",
          background: "#22c55e",
          border: "2px solid white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }} />
        
        {/* AI label on hover */}
        <div style={{
          position: "absolute",
          bottom: "-28px",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "10px",
          fontWeight: "700",
          color: "white",
          background: "rgba(15, 23, 42, 0.9)",
          padding: "4px 12px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          whiteSpace: "nowrap",
          opacity: isHovered ? 1 : 0,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
          ZUCA AI
        </div>
      </motion.button>

      <style>{`
        @keyframes pulse-ring-gold {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }

        @keyframes waveExpand {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }

        .wave-ring {
          animation: waveExpand 2.5s ease-out infinite;
          pointer-events: none;
        }
      `}</style>
    </>
  );
};

export default FloatingAIAssistantButton;