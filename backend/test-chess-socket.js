const { io } = require("socket.io-client");

const socket = io("http://localhost:5000", {
  transports: ["websocket", "polling"]
});

const TEST_USER_ID = "test-user-" + Date.now();

socket.on("connect", () => {
  console.log("✅ Connected:", socket.id);
  socket.emit("join", TEST_USER_ID);
  console.log("📡 Joined as:", TEST_USER_ID);
  socket.emit("chess_get_online");
  console.log("📡 Requested online players...");
});

socket.on("chess_online_list", (list) => {
  console.log("👥 Online players:", JSON.stringify(list, null, 2));
  console.log("✅ chess_get_online works!");
  process.exit(0);
});

socket.on("chess_invite_received", (data) => {
  console.log("📨 Invite received:", data);
});

socket.on("connect_error", (err) => {
  console.error("❌ Connection error:", err.message);
  process.exit(1);
});

setTimeout(() => {
  console.log("❌ Timeout - no response after 5s");
  process.exit(1);
}, 5000);
