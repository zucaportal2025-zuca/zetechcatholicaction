import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

function Games() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    const userData = JSON.parse(localStorage.getItem("user"));
    setUser(userData);
  }, [token, navigate]);

  const games = [
    { id: "tictactoe", name: "Tic Tac Toe", icon: "🎮", color: "#667eea00", description: "Classic 3x3 game. Play vs AI or with friends!" },
    { id: "snake", name: "Snake", icon: "🐍", color: "#f193fb00", description: "Eat food, grow longer, don't crash!" },
    { id: "trivia", name: "Bible Trivia", icon: "📖", color: "#4facfe00", description: "Test your Bible knowledge with fun questions!" },
    { id: "chess", name: "Chess", icon: "♟️", color: "#43e97b00", description: "Classic strategy game. Challenge your mind!" },
  ];

  const handleGameClick = (gameId) => {
    navigate(`/games/${gameId}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={styles.container}
    >
      <div style={styles.header}>
        <button 
          onClick={() => navigate('/dashboard')} 
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "10px 18px",
            background: "white",
            border: "2px solid #e2e8f0",
            borderRadius: "50px",
            color: "#475569",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#4f46e5";
            e.currentTarget.style.color = "white";
            e.currentTarget.style.borderColor = "#4f46e5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "white";
            e.currentTarget.style.color = "#475569";
            e.currentTarget.style.borderColor = "#e2e8f0";
          }}
        >
          ← Back
        </button>
        <div>
          <h1 style={styles.title}>🎮 Games Arcade</h1>
          <p style={styles.subtitle}>Pick a game and have fun!</p>
        </div>
      </div>

      <div style={styles.gamesGrid}>
        {games.map((game, index) => (
          <motion.div
            key={game.id}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            style={styles.gameCard}
            onClick={() => handleGameClick(game.id)}
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
          >
            <div style={{ ...styles.gameIcon, background: game.color }}>
              <span style={styles.gameIconEmoji}>{game.icon}</span>
            </div>
            <h3 style={styles.gameName}>{game.name}</h3>
            <p style={styles.gameDescription}>{game.description}</p>
            <button style={styles.playBtn}>Play Now →</button>
          </motion.div>
        ))}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "20px",
    marginTop: "0px",
    marginBottom: "60px",
    fontFamily: "'Inter', sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    marginBottom: "40px",
    flexWrap: "wrap",
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#1e293b",
    margin: 0,
  },
  subtitle: {
    fontSize: "14px",
    color: "#64748b",
    marginTop: "4px",
  },
  gamesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "24px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  gameCard: {
    background: "white",
    borderRadius: "20px",
    padding: "24px",
    textAlign: "center",
    cursor: "pointer",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
    transition: "all 0.3s ease",
    border: "1px solid #e2e8f0",
  },
  gameIcon: {
    width: "80px",
    height: "80px",
    borderRadius: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
  },
  gameIconEmoji: {
    fontSize: "40px",
  },
  gameName: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: "8px",
  },
  gameDescription: {
    fontSize: "13px",
    color: "#64748b",
    marginBottom: "16px",
  },
  playBtn: {
    padding: "8px 20px",
    background: "#000000b6",
    color: "white",
    border: "none",
    borderRadius: "30px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background 0.2s",
  },
};

export default Games;