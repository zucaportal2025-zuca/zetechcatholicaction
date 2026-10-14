// ==================== CHESS ONLINE SOCKET EVENTS ====================
const { PrismaClient } = require("@prisma/client");

module.exports = function(io, socket, onlineUsers, userSocketMap) {
  
  // Get online users for chess (with names & profiles)
  socket.on("chess_get_online", async () => {
    const prisma = new PrismaClient();
    const onlineList = [];
    
    for (const [userId, sockId] of onlineUsers) {
      if (userId !== userSocketMap.get(socket.id)) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, fullName: true, profileImage: true, membership_number: true }
        });
        
        onlineList.push({
          userId,
          socketId: sockId,
          fullName: user?.fullName || "Unknown Player",
          profileImage: user?.profileImage || null,
          membership: user?.membership_number || ""
        });
      }
    }
    
    socket.emit("chess_online_list", onlineList);
    await prisma.$disconnect();
  });

  // Send chess invite
  socket.on("chess_invite", (data) => {
    const { toUserId, fromUserId, fromName } = data;
    console.log(`♟️ Chess invite: ${fromName} → ${toUserId}`);
    io.to(toUserId).emit("chess_invite_received", {
      fromUserId, fromName, gameType: "chess",
      timestamp: new Date().toISOString()
    });
  });

  // Accept chess invite
  socket.on("chess_accept", (data) => {
    const { gameId, player1Id, player2Id, player1Name, player2Name } = data;
    io.to(player1Id).emit("chess_start", {
      gameId, color: "white", opponent: player2Name, opponentId: player2Id
    });
    io.to(player2Id).emit("chess_start", {
      gameId, color: "black", opponent: player1Name, opponentId: player1Id
    });
  });

  // Chess move sync
  socket.on("chess_move", (data) => {
    const { gameId, opponentId, board, captured } = data;
    io.to(opponentId).emit("chess_opponent_move", { gameId, board, captured });
  });

  // Game over
  socket.on("chess_game_over", (data) => {
    const { gameId, opponentId, winner, reason } = data;
    io.to(opponentId).emit("chess_game_over", { gameId, winner, reason });
  });

  // Rematch
  socket.on("chess_rematch", (data) => {
    const { gameId, opponentId, fromName } = data;
    io.to(opponentId).emit("chess_rematch_requested", { gameId, fromName });
  });

  socket.on("chess_rematch_accept", (data) => {
    const { gameId, player1Id, player2Id, player1Name, player2Name } = data;
    io.to(player1Id).emit("chess_start", {
      gameId, color: "white", opponent: player2Name, opponentId: player2Id
    });
    io.to(player2Id).emit("chess_start", {
      gameId, color: "black", opponent: player1Name, opponentId: player1Id
    });
  });
};