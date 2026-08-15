// Setup Socket.io cơ bản theo mục 7 trong spec.
// Client join room theo user_id sau khi login: socket.emit('join', userId)
// Server join socket đó vào room 'user_<id>', sau này emit bằng io.to('user_' + userId).emit(...)
function initOrderSocket(io) {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('join', (userId) => {
      const room = `user_${userId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined room ${room}`);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });
}

module.exports = initOrderSocket;
