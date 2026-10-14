import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { io } from "socket.io-client";
import BASE_URL from "../../api";

// ==================== CHESS LOGIC ====================

const createInitialBoard = () => {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  board[0] = ["♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜"];
  board[1] = ["♟", "♟", "♟", "♟", "♟", "♟", "♟", "♟"];
  board[6] = ["♙", "♙", "♙", "♙", "♙", "♙", "♙", "♙"];
  board[7] = ["♖", "♘", "♗", "♕", "♔", "♗", "♘", "♖"];
  return board;
};

const getPieceColor = (piece) => {
  if (!piece) return null;
  return ["♙", "♖", "♘", "♗", "♕", "♔"].includes(piece) ? "white" : "black";
};

const getPieceValue = (piece) => {
  const v = { "♟": 1, "♙": 1, "♞": 3, "♘": 3, "♝": 3, "♗": 3, "♜": 5, "♖": 5, "♛": 9, "♕": 9, "♚": 100, "♔": 100 };
  return v[piece] || 0;
};

const isValidMove = (board, fr, fc, tr, tc, turn) => {
  const piece = board[fr][fc];
  if (!piece || getPieceColor(piece) !== turn) return false;
  const target = board[tr][tc];
  if (target && getPieceColor(target) === turn) return false;
  const rd = tr - fr, cd = tc - fc, ard = Math.abs(rd), acd = Math.abs(cd);
  const pt = piece.toLowerCase();
  switch (pt) {
    case "♟": if (cd === 0 && !target) { if (rd === 1) return true; if (rd === 2 && fr === 1) return true; } if (acd === 1 && rd === 1 && target) return true; return false;
    case "♙": if (cd === 0 && !target) { if (rd === -1) return true; if (rd === -2 && fr === 6) return true; } if (acd === 1 && rd === -1 && target) return true; return false;
    case "♜": case "♖": if (fr !== tr && fc !== tc) return false; return !isBlocked(board, fr, fc, tr, tc);
    case "♞": case "♘": return (ard === 2 && acd === 1) || (ard === 1 && acd === 2);
    case "♝": case "♗": if (ard !== acd) return false; return !isBlocked(board, fr, fc, tr, tc);
    case "♛": case "♕": if (fr !== tr && fc !== tc && ard !== acd) return false; return !isBlocked(board, fr, fc, tr, tc);
    case "♚": case "♔": return ard <= 1 && acd <= 1;
    default: return false;
  }
};

const isBlocked = (b, fr, fc, tr, tc) => {
  const rs = fr < tr ? 1 : fr > tr ? -1 : 0, cs = fc < tc ? 1 : fc > tc ? -1 : 0;
  let r = fr + rs, c = fc + cs;
  while (r !== tr || c !== tc) { if (b[r][c]) return true; r += rs; c += cs; }
  return false;
};

const findKing = (b, color) => {
  const k = color === "white" ? "♔" : "♚";
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (b[r][c] === k) return { r, c };
  return null;
};

const isInCheck = (b, color) => {
  const king = findKing(b, color);
  if (!king) return false;
  const opp = color === "white" ? "black" : "white";
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = b[r][c];
    if (p && getPieceColor(p) === opp && isValidMove(b, r, c, king.r, king.c, opp)) return true;
  }
  return false;
};

const getAllValidMoves = (b, color) => {
  const moves = [];
  for (let fr = 0; fr < 8; fr++) for (let fc = 0; fc < 8; fc++) {
    if (b[fr][fc] && getPieceColor(b[fr][fc]) === color) {
      for (let tr = 0; tr < 8; tr++) for (let tc = 0; tc < 8; tc++) {
        if (isValidMove(b, fr, fc, tr, tc, color)) {
          const nb = b.map(r => [...r]); nb[tr][tc] = nb[fr][fc]; nb[fr][fc] = null;
          if (!isInCheck(nb, color)) moves.push({ fromRow: fr, fromCol: fc, toRow: tr, toCol: tc });
        }
      }
    }
  }
  return moves;
};

const isCheckmate = (b, color) => isInCheck(b, color) && getAllValidMoves(b, color).length === 0;

// ==================== AI ====================
const getAIMove = (b, diff) => {
  const moves = getAllValidMoves(b, "black");
  if (!moves.length) return null;
  if (diff === "easy") { const cm = moves.filter(m => b[m.toRow][m.toCol]); return (cm.length && Math.random() > .3) ? cm[Math.floor(Math.random() * cm.length)] : moves[Math.floor(Math.random() * moves.length)]; }
  let best = moves[0], bestS = -Infinity;
  for (const m of moves) {
    let s = 0; const cp = b[m.toRow][m.toCol];
    if (cp) s += getPieceValue(cp) * (diff === "hard" ? 15 : 10);
    s += (7 - (Math.abs(3.5 - m.toCol) + Math.abs(3.5 - m.toRow))) * (diff === "hard" ? 2 : 1);
    if (diff === "hard") { if (m.fromRow === 0 || m.fromRow === 1) s += 3; const nb = b.map(r => [...r]); nb[m.toRow][m.toCol] = nb[m.fromRow][m.fromCol]; nb[m.fromRow][m.fromCol] = null; const om = getAllValidMoves(nb, "white"); for (const o of om) if (o.toRow === m.toRow && o.toCol === m.toCol) s -= getPieceValue(b[m.fromRow][m.fromCol]) * 8; }
    s += Math.random() * 5;
    if (s > bestS) { bestS = s; best = m; }
  }
  return best;
};

// ==================== COMPONENT ====================
export default function Chess() {
  const navigate = useNavigate();
  const [board, setBoard] = useState(createInitialBoard());
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [message, setMessage] = useState("Choose a mode to start");
  const [capturedWhite, setCapturedWhite] = useState([]);
  const [capturedBlack, setCapturedBlack] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [difficulty, setDifficulty] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentTurn, setCurrentTurn] = useState("white");
  const [mode, setMode] = useState(null);
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [showOnlineList, setShowOnlineList] = useState(false);
  const [opponent, setOpponent] = useState(null);
  const [myColor, setMyColor] = useState("white");
  const myColorRef = useRef("white");
  const [gameId, setGameId] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const socketRef = useRef(null);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");

  useEffect(() => { myColorRef.current = myColor; }, [myColor]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (token && user?.id) {
      const socket = io(BASE_URL, { transports: ['websocket', 'polling'] });
      socket.emit("join", user.id);
      socketRef.current = socket;

      socket.on("chess_start", (data) => {
        setGameId(data.gameId);
        setMode("online");
        setGameStarted(true);
        setBoard(createInitialBoard());
        setMyColor(data.color);
        myColorRef.current = data.color;
        setOpponent({ id: data.opponentId, name: data.opponent });
        setCurrentTurn("white");
        setGameOver(false);
        setCapturedWhite([]);
        setCapturedBlack([]);
        setMessage(data.color === "white" ? "Your turn — White" : `${data.opponent}'s turn — White`);
      });

      socket.on("chess_opponent_move", (data) => {
        setBoard(data.board);
        setCurrentTurn(myColorRef.current);
        setMessage("Your turn!");
      });

      socket.on("chess_game_over", (data) => {
        setGameOver(true);
        setMessage(`🏆 ${data.winner} wins! ${data.reason || ''}`);
      });

      socket.on("chess_rematch_requested", (data) => {
        if (window.confirm(`${data.fromName} wants a rematch! Accept?`)) {
          const newColor = myColorRef.current === "white" ? "black" : "white";
          setBoard(createInitialBoard());
          setGameOver(false);
          setCapturedWhite([]);
          setCapturedBlack([]);
          setMyColor(newColor);
          myColorRef.current = newColor;
          setCurrentTurn("white");
          socket.emit("chess_rematch_accept", { gameId, player1Id: newColor === "white" ? user.id : opponent.id, player2Id: newColor === "white" ? opponent.id : user.id, player1Name: newColor === "white" ? user.fullName : opponent.name, player2Name: newColor === "white" ? opponent.name : user.fullName });
        }
      });

      return () => { socket.disconnect(); };
    }
  }, [token, user?.id]);

  useEffect(() => {
    const inviteData = sessionStorage.getItem("chess_invite");
    if (inviteData && socketRef.current && user?.id) {
      try {
        const data = JSON.parse(inviteData);
        sessionStorage.removeItem("chess_invite");
        const gid = Date.now().toString();
        setGameId(gid);
        setMode("online");
        setGameStarted(true);
        setBoard(createInitialBoard());
        setMyColor("black");
        myColorRef.current = "black";
        setOpponent({ id: data.fromUserId, name: data.fromName });
        setMessage(`${data.fromName}'s turn — White`);
        setCurrentTurn("white");
        setGameOver(false);
        setCapturedWhite([]);
        setCapturedBlack([]);
        socketRef.current.emit("chess_accept", { gameId: gid, player1Id: data.fromUserId, player2Id: user.id, player1Name: data.fromName, player2Name: user.fullName });
      } catch (e) { console.error("Failed to process invite:", e); }
    }
  }, [socketRef.current, user?.id]);

  useEffect(() => {
    if (mode === "ai" && gameStarted && !gameOver && currentTurn === "black" && !aiThinking) {
      const t = setTimeout(() => {
        setAiThinking(true);
        const move = getAIMove(board, difficulty);
        if (move) {
          const nb = board.map(r => [...r]);
          const cp = nb[move.toRow][move.toCol];
          nb[move.toRow][move.toCol] = nb[move.fromRow][move.fromCol];
          nb[move.fromRow][move.fromCol] = null;
          if (cp && getPieceColor(cp) === "white") setCapturedWhite(p => [...p, cp]);
          setBoard(nb);
          setCurrentTurn("white");
          if (isCheckmate(nb, "white")) { setMessage("🎉 Checkmate! Black wins!"); setGameOver(true); } else if (isInCheck(nb, "white")) setMessage("⚠️ Check!"); else setMessage("Your turn — White");
        }
        setAiThinking(false);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [currentTurn, mode, gameStarted, gameOver]);

  const handleClick = (row, col) => {
    if (gameOver || aiThinking || !gameStarted) return;
    if (mode === "ai" && currentTurn !== "white") return;
    if (mode === "online" && currentTurn !== myColorRef.current) return;
    const piece = board[row][col];
    if (!selected) {
      const myPieceColor = mode === "ai" ? "white" : myColorRef.current;
      if (piece && getPieceColor(piece) === myPieceColor) {
        setSelected({ row, col });
        const moves = [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
          if (isValidMove(board, row, col, r, c, myPieceColor)) {
            const nb = board.map(r => [...r]); nb[r][c] = nb[row][col]; nb[row][col] = null;
            if (!isInCheck(nb, myPieceColor)) moves.push({ row: r, col: c });
          }
        }
        setValidMoves(moves);
      }
    } else {
      const valid = validMoves.some(m => m.row === row && m.col === col);
      if (valid) {
        const nb = board.map(r => [...r]);
        const cp = nb[row][col];
        nb[row][col] = nb[selected.row][selected.col];
        nb[selected.row][selected.col] = null;
        if (cp) { if (mode === "ai" && getPieceColor(cp) === "black") setCapturedBlack(p => [...p, cp]); else if (getPieceColor(cp) !== myColorRef.current) setCapturedBlack(p => [...p, cp]); }
        setBoard(nb);
        if (mode === "ai") { setCurrentTurn("black"); setMessage("AI thinking..."); } else {
          setCurrentTurn(myColorRef.current === "white" ? "black" : "white");
          setMessage(`${opponent.name}'s turn`);
          socketRef.current?.emit("chess_move", { gameId, opponentId: opponent.id, board: nb, captured: cp });
          if (isCheckmate(nb, myColorRef.current === "white" ? "black" : "white")) { setGameOver(true); setMessage("🏆 You win! Checkmate!"); socketRef.current?.emit("chess_game_over", { gameId, opponentId: opponent.id, winner: user.fullName, reason: "Checkmate" }); }
        }
      }
      setSelected(null); setValidMoves([]);
    }
  };

  const startAI = (level) => { setMode("ai"); setDifficulty(level); setGameStarted(true); setBoard(createInitialBoard()); setSelected(null); setValidMoves([]); setCapturedWhite([]); setCapturedBlack([]); setGameOver(false); setCurrentTurn("white"); setMessage("Your turn — White"); };
  const showOnline = () => { const s = socketRef.current; if (!s) { alert("Not connected."); return; } setShowOnlineList(true); setOnlinePlayers([]); s.emit("chess_get_online"); s.off("chess_online_list"); s.on("chess_online_list", (list) => { if (Array.isArray(list)) setOnlinePlayers(list.filter(p => p.userId !== user.id)); else setOnlinePlayers([]); }); };
  const challengePlayer = (playerId) => { const s = socketRef.current; if (!s) { alert("Not connected."); return; } s.emit("chess_invite", { toUserId: playerId, fromUserId: user.id, fromName: user.fullName }); setShowOnlineList(false); setMessage("⚔️ Challenge sent! Waiting..."); };
  const forfeit = () => { socketRef.current?.emit("chess_forfeit", { gameId, opponentId: opponent.id, winnerName: opponent.name }); setGameOver(true); setMessage(`${opponent.name} wins by forfeit!`); };
  const rematch = () => { socketRef.current?.emit("chess_rematch", { gameId, opponentId: opponent.id, fromName: user.fullName }); };
  const reset = () => { setMode(null); setGameStarted(false); setDifficulty(null); setBoard(createInitialBoard()); setSelected(null); setValidMoves([]); setCapturedWhite([]); se-tCapturedBlack([]); setGameOver(false); setMessage("Choose a mode to start"); setOpponent(null); };

  const isMobile = windowWidth <= 768;
  const sq = isMobile ? Math.min(windowWidth - 32, 400) / 8 : 56;

  if (!gameStarted) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={s.container}>
        <div style={s.headerRow}><button onClick={() => navigate('/games')} style={s.pillBtn}>← Games</button><div><h1 style={s.title}>♟️ Chess</h1><p style={s.sub}>Choose a mode</p></div></div>
        <div style={s.modeContainer}>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setMode("ai")} style={{ ...s.modeCard, borderColor: "#8b5cf6" }}><span style={s.modeIcon}></span><div><h3 style={s.modeTitle}>Play vs zuca </h3><p style={s.modeDesc}>Challenge the computer</p></div></motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={showOnline} style={{ ...s.modeCard, borderColor: "#3b82f6" }}><span style={s.modeIcon}>🌐</span><div><h3 style={s.modeTitle}>Play Online</h3><p style={s.modeDesc}>Challenge a ZUCA member</p></div></motion.div>
        </div>
        {showOnlineList && (<div style={s.modalOverlay} onClick={() => setShowOnlineList(false)}><div style={s.modal} onClick={e => e.stopPropagation()}><h3 style={s.modalTitle}>Online Players</h3>{onlinePlayers.length === 0 ? <p style={s.modalEmpty}>No players online</p> : onlinePlayers.map(p => (<div key={p.userId} style={s.playerRow} onClick={() => challengePlayer(p.userId)}><div style={{ display: "flex", alignItems: "center", gap: "10px" }}>{p.profileImage ? <img src={p.profileImage} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700 }}>{p.fullName?.charAt(0) || "?"}</div>}<div><div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>{p.fullName || "Unknown"}</div>{p.membership && <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.membership}</div>}</div></div><span style={s.challengeBtn}>⚔️ Challenge</span></div>))}<button onClick={() => setShowOnlineList(false)} style={s.closeBtn}>Close</button></div></div>)}
        {mode === "ai" && (<div style={s.diffContainer}><h2 style={s.diffTitle}>Choose Difficulty</h2>{[{ l: "easy", c: "#10b981", i: "", n: "Easy", d: "Random moves" }, { l: "medium", c: "#f59e0b", i: "", n: "Medium", d: "Strategic captures" }, { l: "hard", c: "#ef4444", i: "", n: "Hard", d: "Advanced tactics" }].map(d => (<motion.div key={d.l} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => startAI(d.l)} style={{ ...s.diffCard, borderColor: d.c }}><span style={s.diffIcon}>{d.i}</span><div><h3 style={s.diffName}>{d.n}</h3><p style={s.diffDesc}>{d.d}</p></div></motion.div>))}</div>)}
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={s.container}>
      <div style={s.headerRow}><button onClick={reset} style={s.pillBtn}>← Back</button><div><h1 style={s.title}>♟️ Chess</h1><p style={s.sub}>{mode === "ai" ? `vs AI (${difficulty})` : opponent ? `vs ${opponent.name}` : 'Online'}</p></div></div>
      <div style={{ ...s.statusBar, background: gameOver ? "#fef2f2" : message.includes("Check") ? "#fef3c7" : aiThinking ? "#eff6ff" : "#f0fdf4", borderColor: gameOver ? "#ef4444" : message.includes("Check") ? "#f59e0b" : aiThinking ? "#3b82f6" : "#10b981" }}><span style={s.statusText}>{aiThinking && "⏳ "}{message}</span></div>
      <div style={s.capRow}><span style={s.capLabel}>Captured by opponent:</span><span style={s.capPieces}>{capturedWhite.join(" ")}</span></div>
      <div style={s.capRow}><span style={s.capLabel}>Captured by you:</span><span style={s.capPieces}>{capturedBlack.join(" ")}</span></div>
      <div style={{ ...s.boardOuter, width: sq * 8 + 6 }}><div style={s.boardInner}>{board.map((row, ri) => (<div key={ri} style={s.boardRow}>{row.map((piece, ci) => { const isBlack = (ri + ci) % 2 === 1, isSel = selected?.row === ri && selected?.col === ci, isVM = validMoves.some(m => m.row === ri && m.col === ci), canClick = (mode === "ai" && currentTurn === "white") || (mode === "online" && currentTurn === myColorRef.current); return (<div key={ci} onClick={() => handleClick(ri, ci)} style={{ ...s.square, width: sq, height: sq, background: isSel ? "#fbbf24" : isVM ? (piece ? "#fecaca" : "#bbf7d0") : isBlack ? "#94a3b8" : "#f1f5f9", cursor: (piece && getPieceColor(piece) === (mode === "ai" ? "white" : myColorRef.current) && !gameOver && canClick) || (selected && isVM) ? "pointer" : "default" }}>{ci === 0 && <span style={s.coord}>{8 - ri}</span>}{ri === 7 && <span style={{ ...s.coord, bottom: 1, right: 2, left: "auto" }}>{String.fromCharCode(97 + ci)}</span>}<span style={{ ...s.piece, fontSize: Math.max(sq * 0.6, 18) }}>{piece}</span></div>); })}</div>))}</div></div>
      <div style={s.controls}>{mode === "online" && !gameOver && <button onClick={forfeit} style={{ ...s.ctrlBtn, background: "#ef4444" }}>🏳️ Forfeit</button>}{mode === "online" && gameOver && <button onClick={rematch} style={s.ctrlBtn}>🔄 Rematch</button>}<button onClick={reset} style={{ ...s.ctrlBtn, background: "#64748b" }}>↩ Leave</button></div>
    </motion.div>
  );
}

const s = { container: { minHeight: "100vh", background: "#f8fafc", padding: "16px", fontFamily: "'Inter',-apple-system,sans-serif", display: "flex", flexDirection: "column", alignItems: "center" }, headerRow: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", width: "100%", maxWidth: "600px", flexWrap: "wrap" }, pillBtn: { display: "inline-flex", alignItems: "center", gap: "4px", padding: "8px 14px", background: "white", border: "2px solid #e2e8f0", borderRadius: "50px", color: "#475569", fontSize: "13px", fontWeight: "500", cursor: "pointer", whiteSpace: "nowrap" }, title: { fontSize: "clamp(18px,5vw,24px)", fontWeight: "700", color: "#1e293b", margin: 0 }, sub: { fontSize: "12px", color: "#64748b", margin: "2px 0 0" }, statusBar: { padding: "10px 16px", borderRadius: "12px", border: "2px solid", marginBottom: "10px", width: "100%", maxWidth: "500px", display: "flex", justifyContent: "center" }, statusText: { fontSize: "14px", fontWeight: "600", color: "#1e293b", textAlign: "center" }, capRow: { display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", fontSize: "12px", width: "100%", maxWidth: "500px" }, capLabel: { color: "#64748b", fontWeight: "500", minWidth: "120px" }, capPieces: { fontSize: "16px" }, boardOuter: { borderRadius: "8px", overflow: "hidden", boxShadow: "0 8px 30px rgba(0,0,0,0.15)", border: "2px solid #475569", maxWidth: "95vw" }, boardInner: { display: "flex", flexDirection: "column" }, boardRow: { display: "flex" }, square: { display: "flex", alignItems: "center", justifyContent: "center", position: "relative", transition: "background 0.15s", userSelect: "none" }, coord: { position: "absolute", top: 1, left: 2, fontSize: "8px", fontWeight: "600", color: "#475569", opacity: 0.5, pointerEvents: "none" }, piece: { cursor: "pointer", userSelect: "none", lineHeight: 1 }, controls: { marginTop: "14px", display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }, ctrlBtn: { padding: "10px 18px", color: "white", border: "none", borderRadius: "25px", fontSize: "13px", fontWeight: "500", cursor: "pointer" }, modeContainer: { textAlign: "center", maxWidth: "400px", width: "100%", marginTop: "20px" }, modeCard: { display: "flex", alignItems: "center", gap: "14px", padding: "16px", background: "white", borderRadius: "14px", border: "2px solid", marginBottom: "10px", cursor: "pointer", textAlign: "left" }, modeIcon: { fontSize: "30px" }, modeTitle: { fontSize: "16px", fontWeight: "600", color: "#1e293b", margin: "0 0 3px" }, modeDesc: { fontSize: "12px", color: "#64748b", margin: 0 }, diffContainer: { textAlign: "center", maxWidth: "380px", width: "100%", marginTop: "20px" }, diffTitle: { fontSize: "clamp(18px,4vw,22px)", fontWeight: "700", color: "#1e293b", marginBottom: "20px" }, diffCard: { display: "flex", alignItems: "center", gap: "14px", padding: "16px", background: "white", borderRadius: "14px", border: "2px solid", marginBottom: "10px", cursor: "pointer", textAlign: "left" }, diffIcon: { fontSize: "30px" }, diffName: { fontSize: "16px", fontWeight: "600", color: "#1e293b", margin: "0 0 3px" }, diffDesc: { fontSize: "12px", color: "#64748b", margin: 0 }, modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" }, modal: { background: "white", borderRadius: "16px", padding: "20px", maxWidth: "350px", width: "100%" }, modalTitle: { fontSize: "18px", fontWeight: "700", color: "#1e293b", marginBottom: "16px", textAlign: "center" }, modalEmpty: { textAlign: "center", color: "#64748b", padding: "20px" }, playerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", borderBottom: "1px solid #e2e8f0", cursor: "pointer", borderRadius: "8px" }, challengeBtn: { color: "#3b82f6", fontWeight: "600", fontSize: "12px" }, closeBtn: { marginTop: "12px", width: "100%", padding: "10px", background: "#e2e8f0", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" } };