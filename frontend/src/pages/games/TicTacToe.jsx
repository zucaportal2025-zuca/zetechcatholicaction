import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import io from "socket.io-client";
import BASE_URL from "../../api";

function TicTacToe() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentTurn, setCurrentTurn] = useState(null);
  const [winner, setWinner] = useState(null);
  const [gameMode, setGameMode] = useState(null);
  const [userChoice, setUserChoice] = useState(null);
  const [scores, setScores] = useState({ user: 0, zuca: 0, ties: 0 });
  const [gameStarted, setGameStarted] = useState(false);
  const [difficulty, setDifficulty] = useState(null);
  
  // Multiplayer states
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [pendingInvite, setPendingInvite] = useState(null);
  const [invites, setInvites] = useState([]);
  const [multiplayerGame, setMultiplayerGame] = useState({
    isActive: false,
    gameId: null,
    opponent: null,
    playerSymbol: null,
    isMyTurn: false,
    winnerName: null,
    gameEnded: false
  });
  
  // Game chat states
  const [gameChatMessages, setGameChatMessages] = useState([]);
  const [gameChatInput, setGameChatInput] = useState("");
  const [showGameChat, setShowGameChat] = useState(false);
  const [newMessageAlert, setNewMessageAlert] = useState(false);
  
  const socketRef = useRef(null);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const multiplayerGameRef = useRef({
    isActive: false,
    gameId: null,
    opponent: null,
    playerSymbol: null,
    isMyTurn: false,
    gameEnded: false
  });

  const boardRef = useRef(Array(9).fill(null));
  const chatEndRef = useRef(null);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [gameChatMessages]);

  const showNotification = (title, message, type = "info") => {
    setNotification({ title, message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Single changeMode function with abandon logic
  const changeMode = async () => {
    if (multiplayerGame.isActive && multiplayerGame.gameId) {
      try {
        await axios.put(`${BASE_URL}/api/games/${multiplayerGame.gameId}/abandon`, {}, { headers });
      } catch (err) {
        console.error("Error abandoning game:", err);
      }
    }
    
    setGameMode(null);
    setGameStarted(false);
    setUserChoice(null);
    setWinner(null);
    setBoard(Array(9).fill(null));
    setDifficulty(null);
    setGameChatMessages([]);
    setShowGameChat(false);
    setNewMessageAlert(false);
    setMultiplayerGame({ 
      isActive: false, 
      gameId: null, 
      opponent: null, 
      playerSymbol: null, 
      isMyTurn: false, 
      winnerName: null,
      gameEnded: false 
    });
    multiplayerGameRef.current = { 
      isActive: false, 
      gameId: null, 
      opponent: null, 
      playerSymbol: null, 
      isMyTurn: false,
      gameEnded: false 
    };
  };

  const sendGameChatMessage = () => {
    if (!gameChatInput.trim()) return;
    if (!multiplayerGame.gameId) return;
    
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const senderName = user?.fullName?.split(' ')[0] || 'You';
    const messageText = gameChatInput.trim();
    
    // Send to server - server will broadcast to everyone
    socketRef.current.emit("game_chat_message", {
      gameId: multiplayerGame.gameId,
      message: messageText,
      senderName: senderName,
      senderAvatar: user?.profileImage,
      senderId: user?.id,
      timestamp: timestamp
    });
    
    setGameChatInput("");
  };

  // Clear chat messages
  const clearGameChat = () => {
    setGameChatMessages([]);
  };

  // Toggle chat window
  const toggleGameChat = () => {
    setShowGameChat(!showGameChat);
    if (newMessageAlert) setNewMessageAlert(false);
  };

  // Check for active game on page load/reload - ONLY for active games
  const checkForActiveGame = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/games/active`, { headers });
      
      if (response.data.hasActiveGame && !multiplayerGame.gameEnded && !multiplayerGameRef.current.gameEnded) {
        const game = response.data.game;
        
        const isBoardComplete = game.board && game.board.every(cell => cell !== null);
        if (isBoardComplete) {
          console.log("Board is complete, not restoring game");
          return;
        }
        
        setBoard(game.board);
        setMultiplayerGame({
          isActive: true,
          gameId: game.gameId,
          opponent: game.opponent,
          playerSymbol: game.playerSymbol,
          isMyTurn: game.isMyTurn,
          winnerName: null,
          gameEnded: false
        });
        multiplayerGameRef.current = {
          isActive: true,
          gameId: game.gameId,
          opponent: game.opponent,
          playerSymbol: game.playerSymbol,
          isMyTurn: game.isMyTurn,
          gameEnded: false
        };
        boardRef.current = game.board;
        setGameStarted(true);
        setWinner(null);
        setGameMode(null);
        
        if (socketRef.current) {
          socketRef.current.emit("join_game_room", game.gameId);
        }
        
        showNotification("Game Restored", `Your game against ${game.opponent.fullName} has been restored!`, "info");
      }
    } catch (err) {
      console.error("Error checking for active game:", err);
    }
  };

  // Initialize
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    const userData = JSON.parse(localStorage.getItem("user"));
    setUser(userData);
    
    socketRef.current = io(BASE_URL, {
      auth: { userId: userData.id },
      transports: ['websocket', 'polling']
    });
    
    socketRef.current.on("connect", () => {
      console.log("Socket connected, joining with userId:", userData.id);
      socketRef.current.emit("join", userData.id);
    });
    
    socketRef.current.on("game_invite_received", handleInviteReceived);
    socketRef.current.on("game_start", handleGameStart);
    socketRef.current.on("opponent_move", handleOpponentMove);
    socketRef.current.on("game_finished", handleGameFinished);
    socketRef.current.on("game_invite_declined", handleInviteDeclined);
    socketRef.current.on("game_reset_opponent", handleGameResetOpponent);
    
    // Listen for game chat messages - ENHANCED with avatars
    socketRef.current.on("game_chat_message", (data) => {
      console.log("📩 Chat received:", data);
      
      // Determine if message is from current user
      const isOwn = data.senderId === userData.id;
      
      // Add message to chat with avatar info
      setGameChatMessages(prev => [...prev, {
        id: Date.now(),
        message: data.message,
        senderName: data.senderName,
        senderId: data.senderId,
        senderAvatar: data.senderAvatar,
        timestamp: data.timestamp,
        isOwn: isOwn
      }]);
      
      // Show notification badge if chat is closed and message is from opponent
      if (!showGameChat && !isOwn) {
        setNewMessageAlert(true);
      }
    });
    
    fetchAllUsers();
    fetchInvites();
    checkForActiveGame();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token, navigate]);

  const fetchAllUsers = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/games/users`, { headers });
      setAllUsers(response.data);
      setFilteredUsers(response.data);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const fetchInvites = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/games/invites`, { headers });
      setInvites(response.data);
    } catch (err) {
      console.error("Error fetching invites:", err);
    }
  };

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(allUsers);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = allUsers.filter(u => 
        u.fullName.toLowerCase().includes(term) ||
        (u.membership_number && u.membership_number.toLowerCase().includes(term))
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, allUsers]);

  const calculateWinner = (squares) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: lines[i] };
      }
    }
    if (squares.every(s => s !== null)) return { winner: 'tie', line: [] };
    return null;
  };

  const minimax = (newBoard, depth, isMaximizing, aiSymbol, playerSymbol) => {
    const result = calculateWinner(newBoard);
    if (result) {
      if (result.winner === aiSymbol) return 10 - depth;
      if (result.winner === playerSymbol) return -10 + depth;
      if (result.winner === 'tie') return 0;
    }
    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (newBoard[i] === null) {
          newBoard[i] = aiSymbol;
          let score = minimax(newBoard, depth + 1, false, aiSymbol, playerSymbol);
          newBoard[i] = null;
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (newBoard[i] === null) {
          newBoard[i] = playerSymbol;
          let score = minimax(newBoard, depth + 1, true, aiSymbol, playerSymbol);
          newBoard[i] = null;
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  };

  const getBestMove = (currentBoard, aiSymbol, playerSymbol) => {
    let bestScore = -Infinity;
    let bestMove = null;
    for (let i = 0; i < 9; i++) {
      if (currentBoard[i] === null) {
        currentBoard[i] = aiSymbol;
        let score = minimax(currentBoard, 0, false, aiSymbol, playerSymbol);
        currentBoard[i] = null;
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }
    return bestMove;
  };

  const getAIMove = (currentBoard, aiSymbol, playerSymbol) => {
    const emptySquares = currentBoard.map((sq, idx) => sq === null ? idx : null).filter(v => v !== null);
    if (difficulty === 'easy') {
      return emptySquares[Math.floor(Math.random() * emptySquares.length)];
    } else if (difficulty === 'medium') {
      if (Math.random() < 0.7) {
        return getBestMove([...currentBoard], aiSymbol, playerSymbol);
      } else {
        return emptySquares[Math.floor(Math.random() * emptySquares.length)];
      }
    } else {
      return getBestMove([...currentBoard], aiSymbol, playerSymbol);
    }
  };

  const handleClick = (index) => {
    if (multiplayerGame.isActive) {
      makeMultiplayerMove(index);
      return;
    }
    if (winner || board[index] || !gameStarted) return;
    if (gameMode === 'ai' && currentTurn !== 'user') return;

    const newBoard = [...board];
    const userSymbol = userChoice === 'X' ? 'X' : 'O';
    newBoard[index] = userSymbol;
    setBoard(newBoard);
    setCurrentTurn('zuca');

    const result = calculateWinner(newBoard);
    if (result) {
      if (result.winner === 'tie') {
        setScores(prev => ({ ...prev, ties: prev.ties + 1 }));
        setWinner('tie');
      } else if (result.winner === userSymbol) {
        setScores(prev => ({ ...prev, user: prev.user + 1 }));
        setWinner('user');
      } else {
        setScores(prev => ({ ...prev, zuca: prev.zuca + 1 }));
        setWinner('zuca');
      }
      setGameStarted(false);
    }
  };

  const aiMove = () => {
    if (winner || !gameStarted || gameMode !== 'ai' || currentTurn !== 'zuca') return;
    const emptySquares = board.map((sq, idx) => sq === null ? idx : null).filter(v => v !== null);
    if (emptySquares.length === 0) return;
    
    const zucaSymbol = userChoice === 'X' ? 'O' : 'X';
    const playerSymbol = userChoice === 'X' ? 'X' : 'O';
    const aiMoveIndex = getAIMove([...board], zucaSymbol, playerSymbol);
    
    setTimeout(() => {
      const newBoard = [...board];
      newBoard[aiMoveIndex] = zucaSymbol;
      setBoard(newBoard);
      setCurrentTurn('user');
      const result = calculateWinner(newBoard);
      if (result) {
        if (result.winner === 'tie') {
          setScores(prev => ({ ...prev, ties: prev.ties + 1 }));
          setWinner('tie');
        } else if (result.winner === zucaSymbol) {
          setScores(prev => ({ ...prev, zuca: prev.zuca + 1 }));
          setWinner('zuca');
        } else {
          setScores(prev => ({ ...prev, user: prev.user + 1 }));
          setWinner('user');
        }
        setGameStarted(false);
      }
    }, 400);
  };

  useEffect(() => {
    if (gameMode === 'ai' && gameStarted && currentTurn === 'zuca' && !winner && !multiplayerGame.isActive) {
      aiMove();
    }
  }, [currentTurn, gameStarted, winner, gameMode]);

  // ==================== MULTIPLAYER FUNCTIONS ====================
  
  const handleInviteReceived = (data) => {
    setPendingInvite(data);
    fetchInvites();
    showNotification("🎮 Game Invite!", `${data.fromUser.fullName} wants to play Tic Tac Toe with you!`, "invite");
  };

  const handleGameStart = (data) => {
    if (multiplayerGame.isActive && multiplayerGame.gameId === data.gameId) return;
    
    const opponentName = data.opponent?.fullName || "Opponent";
    
    const gameData = {
      isActive: true,
      gameId: data.gameId,
      opponent: {
        id: data.opponent?.id,
        fullName: opponentName,
        profileImage: data.opponent?.profileImage
      },
      playerSymbol: data.playerSymbol,
      isMyTurn: data.firstTurn,
      winnerName: null,
      gameEnded: false
    };
    
    const emptyBoard = Array(9).fill(null);
    boardRef.current = emptyBoard;
    setBoard(emptyBoard);
    setMultiplayerGame(gameData);
    multiplayerGameRef.current = gameData;
    setWinner(null);
    setGameStarted(true);
    setGameMode(null);
    setGameChatMessages([]);
    
    if (socketRef.current && data.gameId) {
      console.log("Joining game room:", data.gameId);
      socketRef.current.emit("join_game_room", data.gameId);
    }
    
    showNotification("🎮 Game Started!", `You are playing against ${opponentName} as ${data.playerSymbol}. ${data.firstTurn ? "You go first!" : `${opponentName} goes first.`}`, "success");
  };

  const handleOpponentMove = (data) => {
    if (multiplayerGameRef.current.gameEnded) {
      console.log("Game already ended, ignoring opponent move");
      return;
    }
    if (multiplayerGameRef.current.gameId !== data.gameId) return;
    if (!multiplayerGameRef.current.isActive) return;
    
    const newBoard = [...boardRef.current];
    newBoard[data.index] = data.symbol;
    const result = calculateWinner(newBoard);
    
    if (result) {
      boardRef.current = newBoard;
      setBoard(newBoard);
      
      let winnerType = null;
      let winnerName = null;
      
      if (result.winner === 'tie') {
        winnerType = 'tie';
        winnerName = 'tie';
      } else if (result.winner === data.symbol) {
        winnerType = 'opponent';
        winnerName = multiplayerGameRef.current.opponent?.fullName;
      } else {
        winnerType = 'user';
        winnerName = user?.fullName;
      }
      
      setWinner(winnerType);
      setMultiplayerGame(prev => ({ 
        ...prev, 
        isActive: false, 
        gameEnded: true,
        winnerName: winnerName
      }));
      multiplayerGameRef.current.isActive = false;
      multiplayerGameRef.current.gameEnded = true;
      setGameStarted(false);
      
      let message = "";
      if (winnerType === 'tie') {
        message = "🤝 It's a Tie! 🤝";
      } else if (winnerType === 'user') {
        message = "🎉 You Win! 🎉";
      } else if (winnerType === 'opponent') {
        message = `🏆 ${winnerName} Wins! 🏆`;
      }
      showNotification("Game Over", message, "info");
      return;
    }
    
    boardRef.current = newBoard;
    setBoard(newBoard);
    setMultiplayerGame(prev => ({ ...prev, isMyTurn: true }));
    multiplayerGameRef.current.isMyTurn = true;
  };

  const handleGameFinished = (data) => {
    console.log("🎮 Game finished event received:", data);
    
    if (multiplayerGameRef.current.gameEnded) {
      console.log("Game already ended locally, ignoring");
      return;
    }
    
    let winnerType = null;
    let message = "";
    let winnerDisplayName = "";
    
    if (data.winner === "tie") {
      winnerType = 'tie';
      message = "🤝 It's a Tie! 🤝";
      winnerDisplayName = "It's a Tie!";
    } else if (data.winner === user?.id) {
      winnerType = 'user';
      message = "🎉 You Win! 🎉";
      winnerDisplayName = "You Win!";
    } else {
      winnerType = 'opponent';
      winnerDisplayName = data.winnerName || multiplayerGame.opponent?.fullName || "Opponent";
      message = `🏆 ${winnerDisplayName} Wins! 🏆`;
    }
    
    setWinner(winnerType);
    setMultiplayerGame(prev => ({ 
      ...prev, 
      isActive: false, 
      gameEnded: true,
      winnerName: data.winnerName || prev.opponent?.fullName
    }));
    multiplayerGameRef.current.isActive = false;
    multiplayerGameRef.current.gameEnded = true;
    setGameStarted(false);
    
    showNotification("Game Over", message, "info");
  };

  const handleGameResetOpponent = (data) => {
    const emptyBoard = Array(9).fill(null);
    boardRef.current = emptyBoard;
    setBoard(emptyBoard);
    setWinner(null);
    setGameStarted(true);
    setMultiplayerGame(prev => ({ 
      ...prev, 
      isActive: true, 
      isMyTurn: false,
      gameEnded: false,
      winnerName: null
    }));
    multiplayerGameRef.current.isActive = true;
    multiplayerGameRef.current.isMyTurn = false;
    multiplayerGameRef.current.gameEnded = false;
    setGameChatMessages([]);
  };

  const handleInviteDeclined = (data) => {
    showNotification("Invite Declined", data.message, "error");
  };

  const sendGameInvite = (opponentId, opponentName) => {
    socketRef.current.emit("send_game_invite", {
      fromUserId: user.id,
      toUserId: opponentId,
      fromUserName: user.fullName,
      gameType: "tictactoe"
    });
    showNotification("Invite Sent!", `Game invite sent to ${opponentName}`, "success");
    setShowInviteModal(false);
  };

  const acceptInvite = () => {
    if (!pendingInvite) return;
    socketRef.current.emit("accept_game_invite", {
      inviteId: pendingInvite.id,
      fromUserId: pendingInvite.fromUser.id,
      toUserId: user.id,
      gameType: "tictactoe"
    });
    setPendingInvite(null);
    setNotification(null);
    fetchInvites();
  };

  const declineInvite = () => {
    if (!pendingInvite) return;
    socketRef.current.emit("decline_game_invite", {
      inviteId: pendingInvite.id,
      fromUserId: pendingInvite.fromUser.id
    });
    setPendingInvite(null);
    setNotification(null);
    fetchInvites();
  };

  const acceptInviteById = (inviteId, fromUserId) => {
    socketRef.current.emit("accept_game_invite", {
      inviteId: inviteId,
      fromUserId: fromUserId,
      toUserId: user.id,
      gameType: "tictactoe"
    });
    fetchInvites();
  };

  const declineInviteById = (inviteId, fromUserId) => {
    socketRef.current.emit("decline_game_invite", {
      inviteId: inviteId,
      fromUserId: fromUserId
    });
    fetchInvites();
  };

  const makeMultiplayerMove = (index) => {
    if (!multiplayerGameRef.current.isActive) return;
    if (!multiplayerGameRef.current.isMyTurn) return;
    if (boardRef.current[index]) return;
    if (winner) return;
    if (multiplayerGameRef.current.gameEnded) return;

    const newBoard = [...boardRef.current];
    const currentSymbol = multiplayerGameRef.current.playerSymbol;
    newBoard[index] = currentSymbol;
    
    const result = calculateWinner(newBoard);
    
    if (result) {
      boardRef.current = newBoard;
      setBoard(newBoard);
      
      let winnerType = null;
      let winnerName = null;
      
      if (result.winner === 'tie') {
        winnerType = 'tie';
        winnerName = 'tie';
      } else if (result.winner === currentSymbol) {
        winnerType = 'user';
        winnerName = user?.fullName;
      } else {
        winnerType = 'opponent';
        winnerName = multiplayerGameRef.current.opponent?.fullName;
      }
      
      setWinner(winnerType);
      setMultiplayerGame(prev => ({ 
        ...prev, 
        isActive: false, 
        gameEnded: true,
        winnerName: winnerName
      }));
      multiplayerGameRef.current.isActive = false;
      multiplayerGameRef.current.gameEnded = true;
      setGameStarted(false);
      
      socketRef.current.emit("game_over", { 
        gameId: multiplayerGameRef.current.gameId, 
        winner: result.winner === 'tie' ? "tie" : user?.id 
      });
      
      let message = "";
      if (winnerType === 'tie') {
        message = "🤝 It's a Tie! 🤝";
      } else if (winnerType === 'user') {
        message = "🎉 You Win! 🎉";
      }
      showNotification("Game Over", message, "info");
      return;
    }
    
    boardRef.current = newBoard;
    setBoard(newBoard);
    setMultiplayerGame(prev => ({ ...prev, isMyTurn: false }));
    multiplayerGameRef.current.isMyTurn = false;
    
    socketRef.current.emit("game_move", {
      gameId: multiplayerGameRef.current.gameId,
      index: index,
      symbol: currentSymbol,
      nextTurn: multiplayerGameRef.current.opponent.id,
      board: newBoard
    });
  };

  const resetMultiplayerGame = () => {
    const emptyBoard = Array(9).fill(null);
    boardRef.current = emptyBoard;
    setBoard(emptyBoard);
    setWinner(null);
    setGameStarted(true);
    setMultiplayerGame(prev => ({ 
      ...prev, 
      isActive: true, 
      isMyTurn: prev.playerSymbol === 'X',
      gameEnded: false,
      winnerName: null
    }));
    multiplayerGameRef.current.isActive = true;
    multiplayerGameRef.current.isMyTurn = multiplayerGameRef.current.playerSymbol === 'X';
    multiplayerGameRef.current.gameEnded = false;
    setGameChatMessages([]);
    socketRef.current.emit("game_reset", {
      gameId: multiplayerGameRef.current.gameId,
      opponentId: multiplayerGameRef.current.opponent.id
    });
  };

  // ==================== GAME INITIALIZATION ====================
  
  const startGame = (choice) => {
    setUserChoice(choice);
    setBoard(Array(9).fill(null));
    setWinner(null);
    setGameStarted(true);
    setCurrentTurn(choice === 'X' ? 'user' : 'zuca');
  };

  const startWithDifficulty = (level) => {
    setDifficulty(level);
    setGameMode('ai');
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setGameStarted(true);
    setCurrentTurn(userChoice === 'X' ? 'user' : 'zuca');
  };

  // ==================== RENDER SCREENS ====================
  
  if (!gameMode && !multiplayerGame.isActive) {
    return (
      <div style={styles.container}>
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              style={{ ...styles.notification, backgroundColor: notification.type === 'error' ? '#ef4444' : notification.type === 'success' ? '#10b981' : '#3b82f6' }}
            >
              <strong>{notification.title}</strong> {notification.message}
            </motion.div>
          )}
        </AnimatePresence>
        
        <div style={styles.topBar}>
          <button onClick={() => navigate('/games')} style={styles.backBtn}>← Back to Games</button>
          <button onClick={() => setShowInviteModal(true)} style={styles.multiplayerBtn}>👥 Play Online</button>
        </div>
        
        <div style={styles.heroSection}>
          <h1 style={styles.title}>🎮 Tic Tac Toe</h1>
          <p style={styles.subtitle}>Challenge friends or play against ZUCA AI</p>
        </div>
        
        {invites.length > 0 && (
          <div style={styles.pendingInvitesContainer}>
            <h3 style={styles.pendingInvitesTitle}>📨 Pending Game Invites ({invites.length})</h3>
            {invites.map(invite => (
              <div key={invite.id} style={styles.pendingInviteCard}>
                <div style={styles.pendingInviteInfo}>
                  <span style={styles.pendingInviteName}>{invite.fromUser.fullName}</span>
                  <span style={styles.pendingInviteTime}>{new Date(invite.createdAt).toLocaleTimeString()}</span>
                </div>
                <div style={styles.pendingInviteButtons}>
                  <button style={styles.acceptInviteBtnSmall} onClick={() => acceptInviteById(invite.id, invite.fromUser.id)}>Accept</button>
                  <button style={styles.declineInviteBtnSmall} onClick={() => declineInviteById(invite.id, invite.fromUser.id)}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div style={styles.modeContainer}>
          <button style={styles.modeBtn} onClick={() => setGameMode('twoPlayer')}>
            <span style={styles.modeIcon}>👥</span>
            Two Players (Local)
          </button>
        </div>
        
        <div style={styles.difficultyContainer}>
          <h3 style={styles.difficultyTitle}>Select Difficulty vs ZUCA AI</h3>
          <div style={styles.difficultyButtons}>
            <button style={{...styles.difficultyBtn, background: '#10b981'}} onClick={() => startWithDifficulty('easy')}>
              🟢 Easy
            </button>
            <button style={{...styles.difficultyBtn, background: '#f59e0b'}} onClick={() => startWithDifficulty('medium')}>
              🟡 Medium
            </button>
            <button style={{...styles.difficultyBtn, background: '#ef4444'}} onClick={() => startWithDifficulty('hard')}>
              🔴 Hard (Unbeatable)
            </button>
          </div>
        </div>
        
        <AnimatePresence>
          {showInviteModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.modalOverlay} onClick={() => setShowInviteModal(false)}>
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} style={styles.modalContent} onClick={e => e.stopPropagation()}>
                <h3 style={styles.modalTitle}>👥 Invite a Friend</h3>
                <div style={styles.searchContainer}>
                  <input type="text" placeholder="🔍 Search by name or membership number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.searchInput} />
                </div>
                <div style={styles.onlineList}>
                  {filteredUsers.length === 0 ? <p style={styles.noOnline}>No users found</p> : filteredUsers.map(u => (
                    <div key={u.id} style={styles.userItem} onClick={() => sendGameInvite(u.id, u.fullName)}>
                      <div style={styles.userAvatar}>
                        {u.profileImage ? <img src={u.profileImage} alt={u.fullName} style={styles.avatarImage} /> : <span>{u.fullName?.charAt(0).toUpperCase()}</span>}
                        <span style={{...styles.onlineDot, background: u.isOnline ? '#10b981' : '#94a3b8'}}></span>
                      </div>
                      <div style={styles.userInfo}>
                        <span style={styles.userName}>{u.fullName}</span>
                        <span style={styles.userMembership}>{u.membership_number || 'No membership'}</span>
                      </div>
                      <button style={styles.inviteUserBtn}>Invite →</button>
                    </div>
                  ))}
                </div>
                <button style={styles.closeModalBtn} onClick={() => setShowInviteModal(false)}>Close</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (pendingInvite) {
    return (
      <div style={styles.container}>
        <div style={styles.invitePopup}>
          <div style={styles.inviteIcon}>🎮</div>
          <h3>Game Invite!</h3>
          <p>{pendingInvite.fromUser.fullName} wants to play Tic Tac Toe!</p>
          <div style={styles.invitePopupButtons}>
            <button style={styles.acceptInviteBtn} onClick={acceptInvite}>Accept</button>
            <button style={styles.declineInviteBtn} onClick={declineInvite}>Decline</button>
          </div>
        </div>
      </div>
    );
  }

  if (multiplayerGame.isActive) {
    const isMyTurn = multiplayerGame.isMyTurn;
    const playerSymbol = multiplayerGame.playerSymbol;
    const opponentSymbol = playerSymbol === 'X' ? 'O' : 'X';
    const opponentName = multiplayerGame.opponent?.fullName?.split(' ')[0] || 'Opponent';
    const isGameEnded = multiplayerGame.gameEnded;
    
    return (
      <div style={styles.container}>
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              style={{ ...styles.notification, backgroundColor: notification.type === 'error' ? '#ef4444' : notification.type === 'success' ? '#10b981' : '#3b82f6' }}
            >
              <strong>{notification.title}</strong> {notification.message}
            </motion.div>
          )}
        </AnimatePresence>
        
        <div style={styles.topBar}>
          <button onClick={() => navigate('/games')} style={styles.backBtn}>← Back to Games</button>
          <button onClick={changeMode} style={styles.exitGameBtn}>Exit Game</button>
          <button onClick={toggleGameChat} style={styles.chatToggleBtn}>
            💬 {newMessageAlert && !showGameChat && <span style={styles.chatAlert}>●</span>}
          </button>
        </div>
        
        <div style={styles.gameHeader}>
  <h1 style={styles.title}>🎮 Tic Tac Toe</h1>
  <p style={styles.subtitle}>
    <strong>{user?.fullName?.split(" ")[0] || 'You'}</strong> vs <strong>{opponentName}</strong>
  </p>
</div>
        
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap' }}>
          {/* Game Board Section */}
          <div>
            <div style={styles.playersInfo}>
              <div style={{ ...styles.playerCard, ...(isMyTurn && !winner && !isGameEnded && styles.activeTurn) }}>
                <div style={styles.playerSymbol}>{playerSymbol}</div>
                <div style={styles.playerName}>You</div>
                {isMyTurn && !winner && !isGameEnded && <div style={styles.turnIndicator}>⬅️ Your Turn</div>}
              </div>
              <div style={styles.vsDivider}>VS</div>
              <div style={{ ...styles.playerCard, ...(!isMyTurn && !winner && !isGameEnded && styles.activeTurn) }}>
                <div style={styles.playerSymbol}>{opponentSymbol}</div>
                <div style={styles.playerName}>{opponentName}</div>
                {!isMyTurn && !winner && !isGameEnded && <div style={styles.turnIndicator}>🤔 Their Turn</div>}
              </div>
            </div>
            
            <div style={styles.board}>
              {board.map((cell, index) => (
                <motion.button
                  key={index}
                  style={styles.cell}
                  onClick={() => makeMultiplayerMove(index)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={!!winner || !isMyTurn || cell !== null || isGameEnded}
                >
                  {cell && (
                    <motion.span 
                      initial={{ scale: 0, rotate: -180 }} 
                      animate={{ scale: 1, rotate: 0 }} 
                      style={{ color: cell === 'X' ? '#3b82f6' : '#ef4444' }}
                    >
                      {cell}
                    </motion.span>
                  )}
                </motion.button>
              ))}
            </div>
            
            {(winner || isGameEnded) && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={styles.winnerMessage}
              >
                <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '15px' }}>
                  {winner === 'tie' || multiplayerGame.winnerName === 'tie' ? "🤝 It's a Tie! 🤝" : 
                   winner === 'user' ? `🎉 You Win! 🎉` : 
                   winner === 'opponent' ? `🏆 ${multiplayerGame.winnerName || opponentName} Wins! 🏆` :
                   multiplayerGame.winnerName ? `🏆 ${multiplayerGame.winnerName} Wins! 🏆` :
                   `🏆 Game Over! 🏆`}
                </div>
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                  <button style={styles.playAgainBtn} onClick={resetMultiplayerGame}>Play Again</button>
                  <button style={styles.exitGameBtn} onClick={changeMode}>Exit Game</button>
                </div>
              </motion.div>
            )}
            
            {!winner && !isGameEnded && (
              <div style={styles.statusMessage}>
                {isMyTurn ? "👆 Your turn - Tap a square" : `⏳ Waiting for ${opponentName}...`}
              </div>
            )}
          </div>
          
          {/* Chat Section - ENHANCED with avatars */}
          {showGameChat && (
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              style={styles.chatContainer}
            >
              <div style={styles.chatHeader}>
                <span>💬 Game Chat</span>
                <button onClick={clearGameChat} style={styles.chatClearBtn}>Clear</button>
              </div>
              <div id="game-chat-messages" style={styles.chatMessages}>
                {gameChatMessages.length === 0 ? (
                  <div style={styles.chatEmpty}>No messages yet. Say something!</div>
                ) : (
                  gameChatMessages.map((msg, idx) => (
                    <div key={idx} style={{ ...styles.chatMessage, justifyContent: msg.isOwn ? 'flex-end' : 'flex-start' }}>
                      {/* Avatar for opponent messages */}
                      {!msg.isOwn && (
                        <div style={styles.chatAvatar}>
                          {msg.senderAvatar ? (
                            <img src={msg.senderAvatar} alt={msg.senderName} style={styles.chatAvatarImage} />
                          ) : (
                            <div style={styles.chatAvatarPlaceholder}>
                              {msg.senderName?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div style={{ ...styles.chatBubble, backgroundColor: msg.isOwn ? '#3b82f6' : '#e5e7eb', color: msg.isOwn ? 'white' : '#1f2937' }}>
                        <div style={styles.chatMessageSender}>{msg.senderName}</div>
                        <div style={styles.chatMessageText}>{msg.message}</div>
                        <div style={styles.chatMessageTime}>{msg.timestamp}</div>
                      </div>
                      
                      {/* Avatar for own messages (mirrored) */}
                      {msg.isOwn && (
                        <div style={styles.chatAvatar}>
                          {user?.profileImage ? (
                            <img src={user.profileImage} alt={msg.senderName} style={styles.chatAvatarImage} />
                          ) : (
                            <div style={styles.chatAvatarPlaceholder}>
                              {msg.senderName?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
              <div style={styles.chatInputContainer}>
                <input
                  type="text"
                  value={gameChatInput}
                  onChange={(e) => setGameChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendGameChatMessage()}
                  placeholder="Type a message..."
                  style={styles.chatInput}
                />
                <button onClick={sendGameChatMessage} style={styles.chatSendBtn}>Send</button>
              </div>
            </motion.div>
          )}
        </div>
        
        {!showGameChat && !winner && !isGameEnded && (
          <div style={styles.statusMessage}>
            {isMyTurn ? "👆 Your turn - Tap a square" : `⏳ Waiting for ${opponentName}...`}
            <button onClick={toggleGameChat} style={styles.statusChatBtn}>
              💬 {newMessageAlert && <span style={styles.chatNotificationDot}>●</span>}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!userChoice && gameMode === 'ai') {
    return (
      <div style={styles.container}>
        <div style={styles.topBar}>
          <button onClick={() => navigate('/games')} style={styles.backBtn}>← Back to Games</button>
          <button onClick={changeMode} style={styles.changeModeBtn}>Change Mode</button>
        </div>
        <h1 style={styles.title}>🎮 Tic Tac Toe (vs {difficulty === 'easy' ? 'Easy' : difficulty === 'medium' ? 'Medium' : 'Hard'} AI)</h1>
        <div style={styles.choiceContainer}>
          <h2 style={styles.choiceTitle}>Choose your symbol</h2>
          <div style={styles.choiceButtons}>
            <button style={styles.choiceBtn} onClick={() => startGame('X')}>
              <span style={styles.choiceSymbol}>X</span>
              <span style={styles.choiceLabel}>Play as X (Go First)</span>
            </button>
            <button style={styles.choiceBtn} onClick={() => startGame('O')}>
              <span style={styles.choiceSymbol}>O</span>
              <span style={styles.choiceLabel}>Play as O (Go Second)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameMode === 'twoPlayer') {
    const isXTurn = currentTurn === 'user';
    
    const handleTwoPlayerClick = (index) => {
      if (winner || board[index]) return;
      const newBoard = [...board];
      newBoard[index] = isXTurn ? 'X' : 'O';
      setBoard(newBoard);
      setCurrentTurn(isXTurn ? 'zuca' : 'user');
      const result = calculateWinner(newBoard);
      if (result) {
        if (result.winner === 'tie') {
          setScores(prev => ({ ...prev, ties: prev.ties + 1 }));
          setWinner('tie');
        } else if (result.winner === 'X') {
          setScores(prev => ({ ...prev, user: prev.user + 1 }));
          setWinner('X');
        } else {
          setScores(prev => ({ ...prev, zuca: prev.zuca + 1 }));
          setWinner('O');
        }
        setGameStarted(false);
      }
    };
    
    return (
      <div style={styles.container}>
        <div style={styles.topBar}>
          <button onClick={() => navigate('/games')} style={styles.backBtn}>← Back to Games</button>
          <button onClick={changeMode} style={styles.changeModeBtn}>Change Mode</button>
        </div>
        <h1 style={styles.title}>🎮 Tic Tac Toe (2 Players)</h1>
        <div style={styles.playersInfo}>
          <div style={{ ...styles.playerCard, ...(isXTurn && !winner && styles.activeTurn) }}>
            <div style={styles.playerSymbol}>X</div>
            <div style={styles.playerName}>Player 1</div>
            <div style={styles.playerScore}>{scores.user}</div>
            {isXTurn && !winner && <div style={styles.turnIndicator}>⬅️ Turn</div>}
          </div>
          <div style={styles.vsDivider}>VS</div>
          <div style={{ ...styles.playerCard, ...(!isXTurn && !winner && styles.activeTurn) }}>
            <div style={styles.playerSymbol}>O</div>
            <div style={styles.playerName}>Player 2</div>
            <div style={styles.playerScore}>{scores.zuca}</div>
            {!isXTurn && !winner && <div style={styles.turnIndicator}>⬅️ Turn</div>}
          </div>
        </div>
        <div style={styles.tiesScore}>Ties: {scores.ties}</div>
        <div style={styles.board}>
          {board.map((cell, index) => (
            <motion.button key={index} style={styles.cell} onClick={() => handleTwoPlayerClick(index)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={!!winner}>
              {cell && <motion.span initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} style={{ color: cell === 'X' ? '#3b82f6' : '#ef4444' }}>{cell}</motion.span>}
            </motion.button>
          ))}
        </div>
        {winner && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={styles.winnerMessage}>
            {winner === 'tie' ? "It's a Tie! 🤝" : `Player ${winner} Wins! 🎉`}
            <button style={styles.playAgainBtn} onClick={resetGame}>Play Again</button>
          </motion.div>
        )}
        {!winner && <div style={styles.statusMessage}>{isXTurn ? "Player X's turn" : "Player O's turn"}</div>}
        {!winner && <button style={styles.resetBtn} onClick={resetGame}>Reset Game</button>}
      </div>
    );
  }

  const userSymbol = userChoice === 'X' ? 'X' : 'O';
  const zucaSymbol = userChoice === 'X' ? 'O' : 'X';
  const isUserTurn = currentTurn === 'user';

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button onClick={() => navigate('/games')} style={styles.backBtn}>← Back to Games</button>
        <button onClick={changeMode} style={styles.changeModeBtn}>Change Mode</button>
      </div>
      <h1 style={styles.title}>🎮 Tic Tac Toe (vs {difficulty === 'easy' ? 'Easy' : difficulty === 'medium' ? 'Medium' : 'Hard'} AI)</h1>
      <div style={styles.playersInfo}>
        <div style={{ ...styles.playerCard, ...(currentTurn === 'user' && !winner && styles.activeTurn) }}>
          <div style={styles.playerSymbol}>{userSymbol}</div>
          <div style={styles.playerName}>{user?.fullName?.split(' ')[0] || 'You'}</div>
          <div style={styles.playerScore}>{scores.user}</div>
          {currentTurn === 'user' && !winner && <div style={styles.turnIndicator}>⬅️ Your Turn</div>}
        </div>
        <div style={styles.vsDivider}>VS</div>
        <div style={{ ...styles.playerCard, ...(currentTurn === 'zuca' && !winner && styles.activeTurn) }}>
          <div style={styles.playerSymbol}>{zucaSymbol}</div>
          <div style={styles.playerName}>ZUCA AI ({difficulty})</div>
          <div style={styles.playerScore}>{scores.zuca}</div>
          {currentTurn === 'zuca' && !winner && <div style={styles.turnIndicator}>🤖 Thinking...</div>}
        </div>
      </div>
      <div style={styles.tiesScore}>Ties: {scores.ties}</div>
      <div style={styles.board}>
        {board.map((cell, index) => (
          <motion.button key={index} style={styles.cell} onClick={() => handleClick(index)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={!!winner || !gameStarted || currentTurn !== 'user'}>
            {cell && <motion.span initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} style={{ color: cell === 'X' ? '#3b82f6' : '#ef4444' }}>{cell}</motion.span>}
          </motion.button>
        ))}
      </div>
      {winner && (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={styles.winnerMessage}>
          {winner === 'tie' ? "It's a Tie! 🤝" : winner === 'user' ? `🎉 ${user?.fullName?.split(' ')[0] || 'You'} Wins! 🎉` : "🤖 ZUCA AI Wins! 🤖"}
          <button style={styles.playAgainBtn} onClick={resetGame}>Play Again</button>
        </motion.div>
      )}
      {!winner && gameStarted && <div style={styles.statusMessage}>{isUserTurn ? `👆 Your turn (${userSymbol}) - Tap a square` : `🤖 ZUCA AI (${zucaSymbol}) is thinking...`}</div>}
      {!winner && gameStarted && <button style={styles.resetBtn} onClick={resetGame}>Reset Game</button>}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "calc(100vh - 220px)",
    background: "linear-gradient(135deg, #667eea00 0%, #764ba200 100%)",
    padding: "20px",
    marginTop: "35px",
    marginBottom: "-1px",
    borderRadius: "24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "fit-content",
    fontFamily: "'Inter', sans-serif",
    position: "relative",
  },
  notification: {
    position: "fixed",
    top: "80px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "12px 24px",
    borderRadius: "50px",
    color: "white",
    fontSize: "14px",
    fontWeight: "500",
    zIndex: 1001,
    boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
    whiteSpace: "nowrap",
  },
  topBar: {
    position: "fixed",
    top: "50px",
    left: "0",
    right: "0",
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 20px",
    background: "rgba(255,255,255,0.95)",
    zIndex: 100,
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  },
  backBtn: { padding: "8px 16px", background: "#3b82f6", color: "black", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "500" },
  changeModeBtn: { padding: "8px 16px", background: "#f59e0b", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "500" },
  multiplayerBtn: { padding: "8px 16px", background: "#10b981", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "500" },
  exitGameBtn: { padding: "8px 16px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "500" },
  chatToggleBtn: {
    padding: "8px 16px",
    background: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    position: "relative"
  },
  chatAlert: {
    position: "absolute",
    top: "-5px",
    right: "40px",
    width: "20px",
    height: "20px",
    backgroundColor: "#ff0000",
    borderRadius: "50%"
  },
  chatNotificationDot: {
    position: "absolute",
    width: "20px",
    top: "-5px",
    height: "20px",
    backgroundColor: "#ff0a0a",
    borderRadius: "50%",
    marginLeft: "0px"
  },
  
  heroSection: { textAlign: "center", marginBottom: "20px" },
  title: { fontSize: "28px", fontWeight: "800", color: "black", marginBottom: "8px", textShadow: "2px 2px 4px rgba(0,0,0,0.2)" },
  subtitle: { fontSize: "14px", color: "rgb(0, 0, 0)" },
  gameHeader: { textAlign: "center", marginBottom: "15px" },
  
  pendingInvitesContainer: { width: "90%", maxWidth: "400px", background: "rgba(255,255,255,0.95)", borderRadius: "16px", padding: "15px", marginBottom: "20px" },
  pendingInvitesTitle: { fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: "#1e293b", textAlign: "center" },
  pendingInviteCard: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#f8fafc", borderRadius: "10px", marginBottom: "8px" },
  pendingInviteInfo: { display: "flex", flexDirection: "column" },
  pendingInviteName: { fontSize: "13px", fontWeight: "600", color: "#1e293b" },
  pendingInviteTime: { fontSize: "10px", color: "#64748b" },
  pendingInviteButtons: { display: "flex", gap: "8px" },
  acceptInviteBtnSmall: { padding: "5px 12px", background: "#10b981", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "500" },
  declineInviteBtnSmall: { padding: "5px 12px", background: "#ef4444", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "500" },
  
  modeContainer: { display: "flex", gap: "20px", marginTop: "20px", flexWrap: "wrap", justifyContent: "center" },
  modeBtn: { 
    padding: "14px 28px", 
    fontSize: "16px", 
    background: "white", 
    color: "#667eea", 
    border: "none", 
    borderRadius: "16px", 
    cursor: "pointer", 
    fontWeight: "600", 
    boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "transform 0.2s"
  },
  modeIcon: { fontSize: "20px" },
  
  difficultyContainer: { marginTop: "30px", textAlign: "center" },
  difficultyTitle: { color: "black", fontSize: "18px", marginBottom: "15px", fontWeight: "500" },
  difficultyButtons: { display: "flex", gap: "15px", justifyContent: "center", flexWrap: "wrap" },
  difficultyBtn: { padding: "12px 24px", fontSize: "14px", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600", transition: "transform 0.2s" },
  
  choiceContainer: { background: "white", borderRadius: "24px", padding: "30px", textAlign: "center", marginTop: "30px", maxWidth: "400px" },
  choiceTitle: { fontSize: "20px", color: "#1e293b", marginBottom: "20px" },
  choiceButtons: { display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap" },
  choiceBtn: { 
    padding: "20px 30px", 
    background: "#f8fafc", 
    border: "2px solid #e2e8f0", 
    borderRadius: "20px", 
    cursor: "pointer", 
    transition: "all 0.2s",
    minWidth: "140px"
  },
  choiceSymbol: { fontSize: "48px", fontWeight: "bold", display: "block", marginBottom: "10px" },
  choiceLabel: { fontSize: "12px", color: "#64748b" },
  
  playersInfo: { display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px", flexWrap: "wrap", justifyContent: "center" },
  playerCard: { background: "white", borderRadius: "20px", padding: "12px 24px", textAlign: "center", minWidth: "130px", transition: "all 0.3s" },
  activeTurn: { boxShadow: "0 0 0 3px #f59e0b, 0 4px 15px rgba(0,0,0,0.2)", transform: "scale(1.02)" },
  playerSymbol: { fontSize: "28px", fontWeight: "bold", marginBottom: "6px" },
  playerName: { fontSize: "13px", fontWeight: "600", color: "#1e293b", marginBottom: "4px" },
  playerScore: { fontSize: "20px", fontWeight: "bold", color: "#3b82f6" },
  vsDivider: { fontSize: "16px", fontWeight: "bold", color: "black", background: "rgba(255,255,255,0.3)", padding: "8px 12px", borderRadius: "50%" },
  tiesScore: { background: "rgba(255,255,255,0.2)", padding: "5px 15px", borderRadius: "25px", color: "white", fontSize: "12px", marginBottom: "15px" },
  turnIndicator: { fontSize: "10px", color: "#f59e0b", marginTop: "6px", fontWeight: "500" },
  
  board: { display: "grid", gridTemplateColumns: "repeat(3, 105px)", gap: "10px", backgroundColor: "transparent", marginBottom: "20px" },
  cell: { 
    width: "95px", 
    height: "95px", 
    backgroundColor: "white", 
    border: "none", 
    borderRadius: "16px", 
    fontSize: "44px", 
    fontWeight: "700", 
    cursor: "pointer", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    transition: "all 0.2s", 
    boxShadow: "0 4px 12px rgba(243, 247, 0, 0.63)",
    color: "#333"
  },
  
  winnerMessage: { 
    marginTop: "20px", 
    padding: "20px 30px", 
    backgroundColor: "#00ff37", 
    color: "white", 
    borderRadius: "20px", 
    textAlign: "center",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
  },
  playAgainBtn: { marginLeft: "15px", padding: "8px 16px", backgroundColor: "white", color: "#10b981", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  
  statusMessage: { marginTop: "15px", fontSize: "14px", color: "white", textAlign: "center", background: "rgba(0,0,0,0.3)", padding: "8px 16px", borderRadius: "40px" },
  statusChatBtn: { marginLeft: "10px", padding: "4px 12px", background: "#10b981", color: "white", border: "none", borderRadius: "20px", cursor: "pointer", fontSize: "11px", position: "relative" },
  resetBtn: { marginTop: "10px", padding: "8px 20px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  
  // Enhanced Chat styles with avatars
 chatContainer: {
  width: "100%",
  maxWidth: "auto",
  height: "400px", // Fixed height
  background: "white",
  borderRadius: "16px",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  marginTop: "-0px",
  marginBottom: "-10px",
},
  chatHeader: {
    padding: "12px 15px",
    background: "#f3f4f6",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontWeight: "600",
    color: "#374151"
  },
  chatClearBtn: {
    padding: "4px 10px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "11px"
  },
  chatMessages: {
  flex: 1,
  overflowY: "auto", // This makes messages scrollable
  padding: "12px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  // Custom scrollbar styling (optional)
  scrollbarWidth: "thin",
  scrollbarColor: "#cbd5e1 #f1f5f9",
},
  chatEmpty: {
    textAlign: "center",
    color: "#9ca3af",
    padding: "20px",
    fontSize: "13px"
  },
  chatMessage: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    width: "100%"
  },
  chatAvatar: {
    width: "32px",
    height: "32px",
    flexShrink: 0
  },
  chatAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    objectFit: "cover"
  },
  chatAvatarPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontWeight: "600",
    fontSize: "14px"
  },
  chatBubble: {
    maxWidth: "70%",
    padding: "8px 12px",
    borderRadius: "12px",
    wordWrap: "break-word"
  },
  chatMessageSender: {
    fontSize: "10px",
    fontWeight: "600",
    marginBottom: "4px",
    opacity: 0.8
  },
  chatMessageText: {
    fontSize: "13px",
    lineHeight: "1.4"
  },
  chatMessageTime: {
    fontSize: "9px",
    marginTop: "4px",
    opacity: 0.6,
    textAlign: "right"
  },
  chatInputContainer: {
    padding: "12px",
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    gap: "8px",
    background: "white"
  },
  chatInput: {
    flex: 1,
    padding: "8px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: "20px",
    outline: "none",
    fontSize: "13px"
  },
  
  chatSendBtn: {
    padding: "6px 16px",
    background: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "20px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "500"
  },

  chatMessagesScrollbar: {
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f5f9',
    borderRadius: '3px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#cbd5e1',
    borderRadius: '3px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: '#94a3b8',
  },
},
  
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalContent: { background: "white", borderRadius: "24px", padding: "24px", width: "90%", maxWidth: "400px", maxHeight: "80vh", overflow: "auto" },
  modalTitle: { fontSize: "20px", fontWeight: "700", marginBottom: "20px", textAlign: "center", color: "#1e293b" },
  searchContainer: { marginBottom: "20px" },
  searchInput: { width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "14px", outline: "none" },
  onlineList: { maxHeight: "350px", overflowY: "auto" },
  userItem: { display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderBottom: "1px solid #e2e8f0", cursor: "pointer", transition: "background 0.2s" },
  userAvatar: { width: "45px", height: "45px", borderRadius: "50%", background: "linear-gradient(135deg, #667eea, #764ba2)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "600", position: "relative", fontSize: "18px" },
  userInfo: { flex: 1, display: "flex", flexDirection: "column" },
  userName: { fontSize: "15px", fontWeight: "600", color: "#1e293b" },
  userMembership: { fontSize: "11px", color: "#64748b" },
  onlineDot: { position: "absolute", bottom: "2px", right: "2px", width: "12px", height: "12px", borderRadius: "50%", border: "2px solid white" },
  avatarImage: { width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" },
  inviteUserBtn: { padding: "6px 14px", background: "#10b981", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "500" },
  noOnline: { textAlign: "center", color: "#64748b", padding: "30px" },
  closeModalBtn: { width: "100%", padding: "12px", marginTop: "20px", background: "#ef4444", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "500" },
  
  invitePopup: { background: "white", borderRadius: "28px", padding: "35px", textAlign: "center", maxWidth: "320px", margin: "auto" },
  inviteIcon: { fontSize: "50px", marginBottom: "15px" },
  invitePopupButtons: { display: "flex", gap: "15px", justifyContent: "center", marginTop: "25px" },
  acceptInviteBtn: { padding: "12px 24px", background: "#10b981", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600" },
  declineInviteBtn: { padding: "12px 24px", background: "#ef4444", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600" },
};

export default TicTacToe;