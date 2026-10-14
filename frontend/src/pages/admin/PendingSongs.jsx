import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiMusic, FiAlertCircle, FiTrash2, FiLoader } from "react-icons/fi";
import BASE_URL from "../../api";

export default function PendingSongs() {
  const [pendingSongs, setPendingSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [addingId, setAddingId] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchPendingSongs();
  }, []);

  const fetchPendingSongs = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/admin/pending-songs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingSongs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Find the song by title first, then navigate
  const addSong = async (song) => {
    setAddingId(song.id);
    try {
      // Search for the song by its title
      const response = await axios.get(`${BASE_URL}/api/admin/songs?search=${encodeURIComponent(song.title)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Find the exact match by title
      const foundSong = response.data.songs.find(s => 
        s.title.toLowerCase() === song.title.toLowerCase()
      );
      
      if (foundSong) {
        // Navigate to edit the actual song, passing pending ID
        navigate(`/admin/hymns/edit/${foundSong.id}?pendingId=${song.id}`);
      } else {
        alert(`Could not find song: "${song.title}". Please add it manually.`);
      }
    } catch (err) {
      console.error("Error finding song:", err);
      alert("Error finding the song. Please try again.");
    } finally {
      setAddingId(null);
    }
  };

  const deleteSong = async (songId) => {
    if (!window.confirm("Are you sure you want to delete this pending song? This action cannot be undone.")) {
      return;
    }
    setDeletingId(songId);
    try {
      await axios.delete(`${BASE_URL}/api/admin/pending-songs/${songId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingSongs(prev => prev.filter(song => song.id !== songId));
    } catch (err) {
      console.error("Failed to delete pending song:", err);
      alert("Failed to delete. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div style={container}>
        <div style={loadingContainer}>
          <FiLoader size={40} style={spinningIcon} />
          <div style={loadingText}>Loading pending songs...</div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={container}
    >
      <div style={header}>
        <h1 style={title}>Pending Songs</h1>
        <p style={subtitle}>Songs that need lyrics added</p>
      </div>

      {pendingSongs.length === 0 ? (
        <div style={emptyState}>
          <FiMusic size={48} color="#10b981" />
          <h3 style={emptyTitle}>All caught up!</h3>
          <p style={emptyText}>No pending songs need lyrics</p>
        </div>
      ) : (
        <div style={songsList}>
          {pendingSongs.map((song) => (
            <motion.div
              key={song.id}
              style={songCard}
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
            >
              <div style={songInfo}>
                <div style={songIcon}>
                  <FiAlertCircle />
                </div>
                <div style={songDetails}>
                  <h3 style={songTitle}>{song.title}</h3>
                  <div style={songMeta}>
                    <span>Type: {song.type || 'General'}</span>
                    <span>From: {song.program?.date?.split('T')[0] || 'Unknown'}</span>
                  </div>
                </div>
              </div>
              <div style={buttonGroup}>
                <button
                  style={addButton}
                  onClick={() => addSong(song)}
                  disabled={addingId === song.id}
                >
                  {addingId === song.id ? (
                    <><FiLoader size={14} style={spinningIconSmall} /> Finding...</>
                  ) : (
                    <><FiPlus size={16} /> Add Lyrics</>
                  )}
                </button>
                <button
                  style={deleteButton}
                  onClick={() => deleteSong(song.id)}
                  disabled={deletingId === song.id}
                >
                  {deletingId === song.id ? (
                    <><FiLoader size={14} style={spinningIconSmall} /> Deleting...</>
                  ) : (
                    <><FiTrash2 size={14} /> Delete</>
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// Styles (same as before)
const container = {
  padding: "24px",
  maxWidth: "800px",
  marginTop: "50px",
  margin: "0 auto",
  fontFamily: "'Inter', sans-serif",
  minHeight: "100vh",
  background: "#f8fafc",
};

const header = {
  marginBottom: "24px",
};

const title = {
  fontSize: "28px",
  fontWeight: "700",
  color: "#0f172a",
  margin: "0 0 8px 0",
};

const subtitle = {
  fontSize: "14px",
  color: "#64748b",
  margin: 0,
};

const songsList = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const songCard = {
  background: "white",
  borderRadius: "12px",
  padding: "16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: "1px solid #e2e8f0",
  flexWrap: "wrap",
  gap: "12px",
};

const songInfo = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flex: 1,
};

const songIcon = {
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  background: "#fef3c7",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
  color: "#d97706",
};

const songDetails = {
  flex: 1,
};

const songTitle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#0f172a",
  margin: "0 0 4px 0",
};

const songMeta = {
  display: "flex",
  gap: "12px",
  fontSize: "12px",
  color: "#64748b",
  flexWrap: "wrap",
};

const buttonGroup = {
  display: "flex",
  gap: "8px",
};

const addButton = {
  background: "#4f46e5",
  color: "white",
  border: "none",
  padding: "8px 16px",
  borderRadius: "8px",
  fontSize: "13px",
  fontWeight: "500",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const deleteButton = {
  background: "#ef4444",
  color: "white",
  border: "none",
  padding: "8px 16px",
  borderRadius: "8px",
  fontSize: "13px",
  fontWeight: "500",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const emptyState = {
  textAlign: "center",
  padding: "60px 20px",
  background: "white",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
};

const emptyTitle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#0f172a",
  margin: "16px 0 8px 0",
};

const emptyText = {
  fontSize: "14px",
  color: "#64748b",
  margin: 0,
};

const loadingContainer = {
  textAlign: "center",
  padding: "60px",
  color: "#64748b",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "16px",
};

const loadingText = {
  fontSize: "14px",
  color: "#64748b",
};

const spinningIcon = {
  animation: "spin 1s linear infinite",
};

const spinningIconSmall = {
  animation: "spin 1s linear infinite",
};

// Add spin animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);