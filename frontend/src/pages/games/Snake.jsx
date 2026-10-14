import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

function Snake() {
  const navigate = useNavigate();
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [wasPausedBySystem, setWasPausedBySystem] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("snakeHighScore");
    return saved ? parseInt(saved) : 0;
  });
  const [difficulty, setDifficulty] = useState(() => {
    const saved = localStorage.getItem("snakeDifficulty");
    return saved || null;
  });
  const [attemptsLeft, setAttemptsLeft] = useState(1);
  
  // Game state
  const [snake, setSnake] = useState(() => {
    const saved = localStorage.getItem("snakeGameState");
    if (saved && !gameOver) {
      const parsed = JSON.parse(saved);
      return parsed.snake || [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 },
        { x: 7, y: 10 }
      ];
    }
    return [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
      { x: 7, y: 10 }
    ];
  });
  
  const [food, setFood] = useState(null);
  const [direction, setDirection] = useState("RIGHT");
  const [nextDirection, setNextDirection] = useState("RIGHT");
  const [speed, setSpeed] = useState(150);
  
  const gameLoopRef = useRef(null);
  const boardSize = 23;
  
  
  // Difficulty settings
  const difficultySettings = {
    easy: { speed: 250, baseScore: 5, color: "#22c55e", name: "Easy", icon: "🟢" },
    medium: { speed: 150, baseScore: 10, color: "#f59e0b", name: "Medium", icon: "🟡" },
    hard: { speed: 90, baseScore: 15, color: "#ef4444", name: "Hard", icon: "🔴" }
  };
  
  // Show temporary message
  const showTempMessage = (message, type = "info") => {
    const colors = {
      success: "#22c55e",
      error: "#ef4444",
      info: "#3b82f6",
      warning: "#f59e0b"
    };
    
    const msgDiv = document.createElement('div');
    msgDiv.textContent = message;
    msgDiv.style.position = "fixed";
    msgDiv.style.bottom = "20px";
    msgDiv.style.left = "50%";
    msgDiv.style.transform = "translateX(-50%)";
    msgDiv.style.background = colors[type];
    msgDiv.style.color = "white";
    msgDiv.style.padding = "10px 20px";
    msgDiv.style.borderRadius = "30px";
    msgDiv.style.fontSize = "13px";
    msgDiv.style.zIndex = "10000";
    msgDiv.style.fontWeight = "600";
    msgDiv.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
    document.body.appendChild(msgDiv);
    
    setTimeout(() => {
      if (document.body.contains(msgDiv)) {
        msgDiv.remove();
      }
    }, 2500);
  };
  
  // Save game state to localStorage
  const saveGameState = useCallback(() => {
    if (gameStarted && !gameOver && !isPaused) {
      const gameState = {
        snake: snake,
        food: food,
        direction: direction,
        nextDirection: nextDirection,
        score: score,
        difficulty: difficulty,
        speed: speed,
        timestamp: Date.now()
      };
      localStorage.setItem("snakeGameState", JSON.stringify(gameState));
    }
  }, [gameStarted, gameOver, isPaused, snake, food, direction, nextDirection, score, difficulty, speed]);
  
  // Load saved game state on mount
  useEffect(() => {
    const savedState = localStorage.getItem("snakeGameState");
    if (savedState && !gameStarted && !gameOver) {
      const parsed = JSON.parse(savedState);
      // Check if saved state is less than 1 hour old
      if (Date.now() - parsed.timestamp < 3600000) {
        setSnake(parsed.snake);
        setFood(parsed.food);
        setDirection(parsed.direction);
        setNextDirection(parsed.nextDirection);
        setScore(parsed.score);
        setDifficulty(parsed.difficulty);
        setSpeed(parsed.speed);
        setGameStarted(true);
        showTempMessage("🎮 Game restored from previous session!", "success");
      }
    }
  }, []);
  
  // Save state on changes
  useEffect(() => {
    saveGameState();
  }, [saveGameState]);
  
  // Generate random food position
  const generateRandomFood = useCallback((currentSnake) => {
    if (!currentSnake || currentSnake.length === 0) {
      return { x: 15, y: 10 };
    }
    
    const availablePositions = [];
    for (let y = 0; y < boardSize; y++) {
      for (let x = 0; x < boardSize; x++) {
        const isOnSnake = currentSnake.some(segment => 
          segment.x === x && segment.y === y
        );
        if (!isOnSnake) {
          availablePositions.push({ x, y });
        }
      }
    }
    
    if (availablePositions.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * availablePositions.length);
    return availablePositions[randomIndex];
  }, [boardSize]);
  
  // Reset game
  const resetGame = () => {
    const initialSnake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
      { x: 7, y: 10 }
    ];
    setSnake(initialSnake);
    setDirection("RIGHT");
    setNextDirection("RIGHT");
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    setIsPaused(false);
    setWasPausedBySystem(false);
    setAttemptsLeft(1);
    
    const newFood = generateRandomFood(initialSnake);
    setFood(newFood);
    
    if (difficulty) {
      setSpeed(difficultySettings[difficulty].speed);
    }
    
    localStorage.removeItem("snakeGameState");
  };
  
  // Second chance
  const useSecondChance = () => {
    if (attemptsLeft > 0) {
      setAttemptsLeft(0);
      setGameOver(false);
      setGameStarted(true);
      setIsPaused(false);
      setWasPausedBySystem(false);
      
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      gameLoopRef.current = setInterval(moveSnake, speed);
      
      showTempMessage("💪 Second chance! Continue playing!", "success");
    }
  };
  
  // Start game with difficulty
  const startWithDifficulty = (level) => {
    setDifficulty(level);
    localStorage.setItem("snakeDifficulty", level);
    const initialSnake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
      { x: 7, y: 10 }
    ];
    setSnake(initialSnake);
    setDirection("RIGHT");
    setNextDirection("RIGHT");
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    setIsPaused(false);
    setWasPausedBySystem(false);
    setAttemptsLeft(1);
    
    const newFood = generateRandomFood(initialSnake);
    setFood(newFood);
    setSpeed(difficultySettings[level].speed);
    
    localStorage.removeItem("snakeGameState");
  };
  
  // Pause game
  const togglePause = () => {
    if (!gameStarted || gameOver) return;
    
    setIsPaused(!isPaused);
    setWasPausedBySystem(false);
    
    if (!isPaused) {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      showTempMessage("⏸️ Game Paused", "info");
    } else {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      gameLoopRef.current = setInterval(moveSnake, speed);
      showTempMessage("▶️ Game Resumed", "success");
    }
  };
  
  // Move snake
  const moveSnake = useCallback(() => {
    if (isPaused || gameOver) return;
    
    setDirection(nextDirection);
    
    const currentDirection = nextDirection;
    const head = snake[0];
    let newHead = { ...head };
    
    switch (currentDirection) {
      case "RIGHT": newHead.x += 1; break;
      case "LEFT": newHead.x -= 1; break;
      case "UP": newHead.y -= 1; break;
      case "DOWN": newHead.y += 1; break;
      default: break;
    }
    
    // Check collision with walls
    if (newHead.x < 0 || newHead.x >= boardSize || newHead.y < 0 || newHead.y >= boardSize) {
      if (attemptsLeft > 0) {
        setGameOver(true);
        showTempMessage("💀 Game Over! You have a second chance!", "warning");
        return;
      } else {
        setGameOver(true);
        setGameStarted(false);
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        localStorage.removeItem("snakeGameState");
        showTempMessage(`💀 Game Over! Final Score: ${score}`, "error");
      }
      return;
    }
    
    if (!food) {
      const newFood = generateRandomFood(snake);
      setFood(newFood);
      return;
    }
    
    const isEating = newHead.x === food.x && newHead.y === food.y;
    
    let newSnake;
    const pointsEarned = difficultySettings[difficulty]?.baseScore || 10;
    
    if (isEating) {
      newSnake = [newHead, ...snake];
      const newScore = score + pointsEarned;
      setScore(newScore);
      
      const newFood = generateRandomFood(newSnake);
      if (newFood === null) {
        if (attemptsLeft > 0) {
          setGameOver(true);
          showTempMessage("🎉 Almost filled the board! Second chance available!", "warning");
          return;
        } else {
          setGameOver(true);
          setGameStarted(false);
          if (gameLoopRef.current) clearInterval(gameLoopRef.current);
          return;
        }
      }
      setFood(newFood);
      
      if ((score + pointsEarned) % 100 < pointsEarned && speed > 60) {
        setSpeed(prev => Math.max(60, prev - 5));
        showTempMessage(`⚡ Speed increased!`, "info");
      }
    } else {
      newSnake = [newHead, ...snake.slice(0, -1)];
    }
    
    const headCollision = newSnake.slice(1).some(segment => 
      segment.x === newHead.x && segment.y === newHead.y
    );
    
    if (headCollision) {
      if (attemptsLeft > 0) {
        setGameOver(true);
        showTempMessage("💥 You crashed! Second chance available!", "warning");
        return;
      } else {
        setGameOver(true);
        setGameStarted(false);
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        localStorage.removeItem("snakeGameState");
        showTempMessage(`💥 Game Over! Final Score: ${score}`, "error");
      }
      return;
    }
    
    setSnake(newSnake);
  }, [snake, food, nextDirection, difficulty, score, generateRandomFood, difficultySettings, speed, isPaused, gameOver, attemptsLeft]);
  
  // Handle keyboard controls (desktop)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!gameStarted || gameOver || isPaused) return;
      
      const key = e.key;
      const opposite = {
        "ArrowUp": "DOWN",
        "ArrowDown": "UP",
        "ArrowLeft": "RIGHT",
        "ArrowRight": "LEFT"
      };
      
      let newDir = null;
      if (key === "ArrowUp") newDir = "UP";
      if (key === "ArrowDown") newDir = "DOWN";
      if (key === "ArrowLeft") newDir = "LEFT";
      if (key === "ArrowRight") newDir = "RIGHT";
      
      if (newDir && opposite[key] !== direction) {
        setNextDirection(newDir);
        e.preventDefault();
      }
      
      if (key === " " || key === "Space" || key === "p" || key === "P") {
        togglePause();
        e.preventDefault();
      }
    };
    
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [gameStarted, gameOver, direction, isPaused]);
  
  // Game loop
  useEffect(() => {
    if (gameStarted && !gameOver && !isPaused && food) {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      gameLoopRef.current = setInterval(moveSnake, speed);
    }
    
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameStarted, gameOver, moveSnake, speed, food, isPaused]);
  
  // Enhanced visibility change handler (handles phone calls, tab switches, etc.)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (gameStarted && !gameOver && !isPaused) {
          setIsPaused(true);
          setWasPausedBySystem(true);
          if (gameLoopRef.current) clearInterval(gameLoopRef.current);
          showTempMessage("📞 Game paused - Phone call or app switch detected", "warning");
        }
      } else {
        if (wasPausedBySystem && isPaused && gameStarted && !gameOver) {
          const resumePrompt = document.createElement('div');
          resumePrompt.innerHTML = `
            <div style="
              position: fixed;
              bottom: 80px;
              left: 50%;
              transform: translateX(-50%);
              background: #1e293b;
              color: white;
              padding: 12px 20px;
              border-radius: 30px;
              font-size: 13px;
              z-index: 10000;
              display: flex;
              gap: 12px;
              align-items: center;
              box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            ">
              <span>📱 Welcome back!</span>
              <button id="resumeGameBtn" style="
                background: #22c55e;
                border: none;
                padding: 6px 16px;
                border-radius: 25px;
                color: white;
                font-weight: bold;
                cursor: pointer;
              ">Resume Game ▶️</button>
            </div>
          `;
          document.body.appendChild(resumePrompt);
          
          const resumeBtn = document.getElementById('resumeGameBtn');
          if (resumeBtn) {
            resumeBtn.onclick = () => {
              setIsPaused(false);
              setWasPausedBySystem(false);
              if (gameLoopRef.current) clearInterval(gameLoopRef.current);
              gameLoopRef.current = setInterval(moveSnake, speed);
              resumePrompt.remove();
              showTempMessage("▶️ Game Resumed", "success");
            };
          }
          
          setTimeout(() => {
            if (document.body.contains(resumePrompt)) {
              resumePrompt.remove();
            }
          }, 10000);
        }
      }
    };
    
    const handlePageHide = () => {
      if (gameStarted && !gameOver && !isPaused) {
        setIsPaused(true);
        setWasPausedBySystem(true);
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      }
    };
    
    const handleWindowBlur = () => {
      if (gameStarted && !gameOver && !isPaused) {
        setIsPaused(true);
        setWasPausedBySystem(true);
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("blur", handleWindowBlur);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [gameStarted, gameOver, isPaused, wasPausedBySystem, moveSnake, speed]);
  
  // Update high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("snakeHighScore", score.toString());
      if (score > 0) {
        showTempMessage(`🏆 New High Score: ${score}! 🏆`, "success");
      }
    }
  }, [score, highScore]);
  
  // Touch controls
  const handleTouchDirection = (dir) => {
    if (!gameStarted || gameOver || isPaused) return;
    
    const opposite = {
      "UP": "DOWN", "DOWN": "UP", "LEFT": "RIGHT", "RIGHT": "LEFT"
    };
    
    if (opposite[dir] !== direction) {
      setNextDirection(dir);
    }
  };
  
  // Difficulty selection screen
  if (!difficulty && !gameStarted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={styles.container}
      >
        <div style={styles.header}>
          <button onClick={() => navigate('/games')} style={styles.backButton}>
            ← Back
          </button>
          <h1 style={styles.title}>🐍 Snake Game</h1>
        </div>
        
        <div style={styles.difficultyContainer}>
          <h2 style={styles.difficultyTitle}>Select Difficulty</h2>
          <div style={styles.difficultyButtons}>
            {Object.entries(difficultySettings).map(([key, setting]) => (
              <button 
                key={key}
                style={{...styles.difficultyBtn, background: setting.color}}
                onClick={() => startWithDifficulty(key)}
              >
                <span style={styles.difficultyEmoji}>{setting.icon}</span>
                <span style={styles.difficultyText}>{setting.name}</span>
                <span style={styles.difficultySpeed}>
                  {key === 'easy' ? '🐌 Very Slow' : key === 'medium' ? '⚡ Normal' : '🚀 Fast'}
                </span>
              </button>
            ))}
          </div>
          <p style={styles.difficultyNote}>🎮 Tap buttons to control the snake</p>
          <p style={styles.difficultyNote}>⏸️ Use pause button to pause game</p>
          <p style={styles.difficultyNote}>📞 Auto-pauses on phone calls</p>
          <p style={styles.difficultyNote}>💪 One second chance per game</p>
        </div>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={styles.container}
    >
      <div style={styles.header}>
        <button onClick={() => {
          setDifficulty(null);
          setGameStarted(false);
          if (gameLoopRef.current) clearInterval(gameLoopRef.current);
          localStorage.removeItem("snakeGameState");
          localStorage.removeItem("snakeDifficulty");
        }} style={styles.backButton}>
          ← Change
        </button>
        <div style={styles.scoreHeader}>
          <button onClick={togglePause} style={styles.pauseButton}>
            {isPaused ? "▶️" : "⏸️"}
          </button>
          <div style={styles.scoreBadge}>
            🎯 {score}
          </div>
          <div style={styles.scoreBadge}>
            🏆 {highScore}
          </div>
          <div style={{...styles.scoreBadge, background: difficultySettings[difficulty]?.color}}>
            {difficultySettings[difficulty]?.icon} {difficultySettings[difficulty]?.name}
          </div>
        </div>
      </div>
      
      <div style={styles.gameContainer}>
        {/* Game Board */}
        <div style={styles.boardWrapper}>
          <div style={styles.board}>
            {Array(boardSize).fill().map((_, row) => (
              <div key={row} style={styles.row}>
                {Array(boardSize).fill().map((_, col) => {
                  const isSnake = snake.some(segment => segment.x === col && segment.y === row);
                  const isFood = food && food.x === col && food.y === row;
                  const isHead = snake[0]?.x === col && snake[0]?.y === row;
                  
                  let cellStyle = { ...styles.cell };
                  if (isSnake) {
                    cellStyle = { ...cellStyle, ...styles.snakeCell };
                    if (isHead) {
                      cellStyle = { ...cellStyle, ...styles.headCell };
                    }
                  }
                  if (isFood && !isSnake) {
                    cellStyle = { ...cellStyle, ...styles.foodCell };
                  }
                  
                  return (
                    <div key={col} style={cellStyle}>
                      {isFood && !isSnake && "🍎"}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        
        {/* Pause Overlay */}
        <AnimatePresence>
          {isPaused && !gameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={styles.pauseOverlay}
            >
              <div style={styles.pauseContent}>
                <div style={styles.pauseIcon}>⏸️</div>
                <h2 style={styles.pauseTitle}>Game Paused</h2>
                <p style={styles.pauseText}>Tap ▶️ button to resume</p>
                <button onClick={togglePause} style={styles.resumeButton}>
                  Resume Game
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Touch Controls */}
        <div style={styles.touchControls}>
          <button 
            style={styles.controlBtnUp} 
            onClick={() => handleTouchDirection("UP")}
            onTouchStart={() => handleTouchDirection("UP")}
            disabled={isPaused}
          >
            ▲
          </button>
          <div style={styles.controlRow}>
            <button 
              style={styles.controlBtn} 
              onClick={() => handleTouchDirection("LEFT")}
              onTouchStart={() => handleTouchDirection("LEFT")}
              disabled={isPaused}
            >
              ◀
            </button>
            <button 
              style={styles.controlBtn} 
              onClick={() => handleTouchDirection("DOWN")}
              onTouchStart={() => handleTouchDirection("DOWN")}
              disabled={isPaused}
            >
              ▼
            </button>
            <button 
              style={styles.controlBtn} 
              onClick={() => handleTouchDirection("RIGHT")}
              onTouchStart={() => handleTouchDirection("RIGHT")}
              disabled={isPaused}
            >
              ▶
            </button>
          </div>
          <p style={styles.controlHint}>Tap buttons to move | ⏸️ to pause</p>
          {attemptsLeft > 0 && !gameOver && (
            <p style={styles.attemptsHint}>💪 {attemptsLeft} second chance available</p>
          )}
        </div>
        
        {/* Game Over Modal with Second Chance */}
        <AnimatePresence>
          {gameOver && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              style={styles.gameOverModal}
            >
              <div style={styles.gameOverContent}>
                <div style={styles.gameOverIcon}>💀</div>
                <h2 style={styles.gameOverTitle}>Game Over!</h2>
                <p style={styles.gameOverScore}>Score: {score}</p>
                {score === highScore && score > 0 && (
                  <p style={styles.newHighScore}>🎉 New High Score! 🎉</p>
                )}
                {attemptsLeft > 0 && (
                  <div style={styles.secondChanceContainer}>
                    <p style={styles.secondChanceText}>💪 You have a second chance!</p>
                    <button onClick={useSecondChance} style={styles.secondChanceBtn}>
                      Continue Playing →
                    </button>
                  </div>
                )}
                <div style={styles.gameOverButtons}>
                  <button onClick={resetGame} style={styles.playAgainBtn}>
                    Play Again
                  </button>
                  <button onClick={() => {
                    setDifficulty(null);
                    setGameStarted(false);
                    localStorage.removeItem("snakeGameState");
                    localStorage.removeItem("snakeDifficulty");
                  }} style={styles.changeDifficultyBtn}>
                    Change Difficulty
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)",
    padding: "12px",
    paddingTop: "60px",
    fontFamily: "'Inter', sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    overflow: "hidden",
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    maxWidth: "500px",
    marginBottom: "15px",
    flexWrap: "wrap",
    gap: "10px",
    flexShrink: 0,
  },
  backButton: {
    padding: "8px 16px",
    background: "rgba(0,0,0,0.1)",
    border: "1px solid rgba(0,0,0,0.2)",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    color: "black",
    fontWeight: "500",
  },
  title: {
    fontSize: "22px",
    fontWeight: "700",
    color: "black",
    margin: 0,
  },
  scoreHeader: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  pauseButton: {
    background: "rgba(0,0,0,0.3)",
    border: "none",
    borderRadius: "20px",
    padding: "5px 12px",
    cursor: "pointer",
    fontSize: "18px",
    color: "white",
    minWidth: "48px",
    minHeight: "36px",
  },
  scoreBadge: {
    background: "rgba(0,0,0,0.3)",
    padding: "5px 12px",
    borderRadius: "20px",
    color: "white",
    fontSize: "14px",
    fontWeight: "600",
  },
  gameContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    maxWidth: "500px",
    position: "relative",
    flex: 1,
    justifyContent: "center",
  },
  boardWrapper: {
    background: "#1a1a2e",
    borderRadius: "16px",
    padding: "8px",
    boxShadow: "0 20px 35px -8px rgba(0,0,0,0.3)",
    overflow: "hidden",
    flexShrink: 0,
    position: "relative",
  },
  board: {
    display: "flex",
    flexDirection: "column",
    margin: "0 auto",
  },
  row: {
    display: "flex",
  },
  cell: {
    width: "clamp(14px, 4vw, 24px)",
    height: "clamp(14px, 4vw, 24px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "clamp(8px, 2.5vw, 14px)",
    border: "1px solid rgba(255,255,255,0.05)",
    transition: "all 0.1s ease",
  },
  snakeCell: {
    background: "#22c55e",
    borderRadius: "4px",
    boxShadow: "0 0 5px rgba(34,197,94,0.5)",
  },
  headCell: {
    background: "#fbbf24",
    borderRadius: "4px",
    boxShadow: "0 0 8px rgba(251,191,36,0.8)",
  },
  foodCell: {
    background: "#ef4444",
    borderRadius: "50%",
    animation: "pulse 0.5s ease infinite",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  pauseOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "16px",
    zIndex: 10,
  },
  pauseContent: {
    textAlign: "center",
    background: "white",
    borderRadius: "24px",
    padding: "30px",
  },
  pauseIcon: {
    fontSize: "60px",
    marginBottom: "15px",
  },
  pauseTitle: {
    fontSize: "24px",
    color: "#1e293b",
    marginBottom: "10px",
  },
  pauseText: {
    fontSize: "14px",
    color: "#64748b",
    marginBottom: "20px",
  },
  resumeButton: {
    padding: "10px 24px",
    background: "#22c55e",
    color: "white",
    border: "none",
    borderRadius: "40px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  touchControls: {
    marginTop: "20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    flexShrink: 0,
  },
  controlBtnUp: {
    width: "clamp(70px, 18vw, 90px)",
    height: "clamp(70px, 18vw, 90px)",
    background: "rgba(0, 0, 0, 0.7)",
    border: "none",
    borderRadius: "25px",
    fontSize: "clamp(32px, 8vw, 42px)",
    color: "white",
    cursor: "pointer",
    transition: "all 0.2s",
    marginBottom: "5px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
  },
  controlRow: {
    display: "flex",
    gap: "clamp(20px, 5vw, 35px)",
    justifyContent: "center",
  },
  controlBtn: {
    width: "clamp(70px, 18vw, 90px)",
    height: "clamp(70px, 18vw, 90px)",
    background: "rgba(0, 0, 0, 0.7)",
    border: "none",
    borderRadius: "25px",
    fontSize: "clamp(32px, 8vw, 42px)",
    color: "white",
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
  },
  controlHint: {
    fontSize: "12px",
    color: "#555",
    marginTop: "5px",
    textAlign: "center",
  },
  attemptsHint: {
    fontSize: "11px",
    color: "#22c55e",
    marginTop: "5px",
    textAlign: "center",
    fontWeight: "500",
  },
  difficultyContainer: {
    textAlign: "center",
    background: "rgba(0, 255, 221, 0.3)",
    backdropFilter: "blur(10px)",
    borderRadius: "24px",
    padding: "30px 20px",
    width: "100%",
    maxWidth: "350px",
    margin: "auto",
  },
  difficultyTitle: {
    fontSize: "24px",
    color: "black",
    marginBottom: "25px",
  },
  difficultyButtons: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  difficultyBtn: {
    padding: "18px 20px",
    fontSize: "18px",
    fontWeight: "600",
    color: "white",
    border: "none",
    borderRadius: "20px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    transition: "transform 0.2s",
  },
  difficultyEmoji: {
    fontSize: "28px",
  },
  difficultyText: {
    fontSize: "18px",
    fontWeight: "700",
  },
  difficultySpeed: {
    fontSize: "13px",
    opacity: 0.9,
    padding: "4px 10px",
    background: "rgba(0,0,0,0.2)",
    borderRadius: "20px",
  },
  difficultyNote: {
    fontSize: "12px",
    color: "rgb(0, 0, 0)",
    marginTop: "15px",
  },
  gameOverModal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  gameOverContent: {
    background: "linear-gradient(135deg, #1e293b, #0f172a)",
    borderRadius: "28px",
    padding: "35px",
    textAlign: "center",
    width: "90%",
    maxWidth: "320px",
  },
  gameOverIcon: {
    fontSize: "70px",
    marginBottom: "15px",
  },
  gameOverTitle: {
    fontSize: "28px",
    color: "white",
    marginBottom: "10px",
  },
  gameOverScore: {
    fontSize: "20px",
    color: "#fbbf24",
    marginBottom: "10px",
    fontWeight: "600",
  },
  newHighScore: {
    fontSize: "14px",
    color: "#22c55e",
    marginBottom: "20px",
  },
  secondChanceContainer: {
    marginBottom: "20px",
    padding: "15px",
    background: "rgba(34,197,94,0.2)",
    borderRadius: "16px",
  },
  secondChanceText: {
    fontSize: "14px",
    color: "#22c55e",
    marginBottom: "10px",
  },
  secondChanceBtn: {
    padding: "8px 20px",
    background: "#22c55e",
    color: "white",
    border: "none",
    borderRadius: "40px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  gameOverButtons: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  playAgainBtn: {
    padding: "12px 24px",
    background: "#22c55e",
    color: "white",
    border: "none",
    borderRadius: "40px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  changeDifficultyBtn: {
    padding: "12px 24px",
    background: "rgba(255,255,255,0.15)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: "40px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
};

// Add animation to document
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
`;
document.head.appendChild(style);

export default Snake;