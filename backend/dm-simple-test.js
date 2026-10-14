const io = require('socket.io-client');

// Your test data
const userId = 'b05593f2-df6c-44fa-89a7-b718e1493b03';
const conversationId = '9a7bed0d-a46f-45d2-ad1a-79a5fd8946cb';

console.log('🔌 Connecting to Socket.io server...');

const socket = io('http://localhost:5000', {
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('✅ Connected! Socket ID:', socket.id);
  
  // Join as user
  socket.emit('dm:join', userId);
  console.log(`📡 Joined as user: ${userId}`);
  
  // Send a test message after 2 seconds
  setTimeout(() => {
    console.log('\n📤 Sending test message...');
    socket.emit('dm:send_message', {
      conversationId: conversationId,
      content: `Test message at ${new Date().toLocaleTimeString()}`,
      files: [],
      tempId: Date.now().toString()
    });
  }, 2000);
  
  // Send typing indicator after 4 seconds
  setTimeout(() => {
    console.log('✏️ Sending typing indicator...');
    socket.emit('dm:typing_start', { conversationId });
  }, 4000);
  
  // Stop typing after 6 seconds
  setTimeout(() => {
    console.log('✏️ Stopping typing...');
    socket.emit('dm:typing_stop', { conversationId });
  }, 6000);
  
  // Disconnect after 10 seconds
  setTimeout(() => {
    console.log('👋 Disconnecting...');
    socket.disconnect();
    process.exit(0);
  }, 10000);
});

socket.on('dm:new_message', (data) => {
  console.log('📨 New message received:', data.content);
  console.log('   From:', data.sender?.fullName);
});

socket.on('dm:message_sent', (data) => {
  console.log('✅ Message sent! ID:', data.id);
});

socket.on('dm:typing_start', (data) => {
  console.log('✏️ User is typing in conversation:', data.conversationId);
});

socket.on('dm:typing_stop', (data) => {
  console.log('✏️ User stopped typing');
});

socket.on('dm:user_online', (data) => {
  console.log('🟢 User online:', data.userId);
});

socket.on('dm:error', (data) => {
  console.error('❌ Error:', data.error);
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected');
});

socket.on('connect_error', (err) => {
  console.error('❌ Connection error:', err.message);
});
