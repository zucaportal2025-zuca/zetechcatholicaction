// frontend/src/components/AnimatedBackground.jsx
import { useEffect, useState } from "react";

const AnimatedBackground = () => {
  const [bubbles, setBubbles] = useState([]);
  const [stars, setStars] = useState([]);

  

  return (
    <div className="animated-bg-container">
     
      {bubbles.map((bubble) => (
        <div
          key={`bubble-${bubble.id}`}
          className="bubble"
          style={{
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            top: `${bubble.top}%`,
            left: `${bubble.left}%`,
            animationDuration: `${bubble.duration}s`,
            animationDelay: `${bubble.delay}s`,
          }}
        />
      ))}
      
      {stars.map((star) => (
        <div
          key={`star-${star.id}`}
          className="star"
          style={{
            width: `${star.size}px`,
            height: `${star.size}px`,
            top: `${star.top}%`,
            left: `${star.left}%`,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}

      <style>{`
        .animated-bg-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 9;
          overflow: hidden;
        }

        .bubble {
          position: absolute;
          background: radial-gradient(circle, rgba(244, 244, 245, 0.8), rgba(255, 255, 255, 0.4));
          border-radius: 50%;
          animation: floatBubble infinite ease-in-out;
          border: 2px solid rgba(59, 68, 246, 0.5);
          box-shadow: 0 0 10px rgba(59, 131, 246, 0);
        }

        .star {
          position: absolute;
          background: #00ccff;
          border-radius: 50%;
          animation: twinkle infinite alternate;
          box-shadow: 0 0 6px #ffd700;
        }

        @keyframes floatBubble {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.8;
          }
          25% {
            transform: translate(30px, -40px) scale(1.05);
            opacity: 1;
          }
          50% {
            transform: translate(-20px, -60px) scale(0.95);
            opacity: 0.9;
          }
          75% {
            transform: translate(40px, -20px) scale(1.02);
            opacity: 0.95;
          }
        }

        @keyframes twinkle {
          0% {
            opacity: 0.5;
            transform: scale(1);
          }
          100% {
            opacity: 1;
            transform: scale(1.5);
          }
        }
      `}</style>
    </div>
  );
};

export default AnimatedBackground;