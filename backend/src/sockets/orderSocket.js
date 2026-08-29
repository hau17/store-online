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

// Dùng chung cho mọi nơi cần bắn event tới đúng 1 user (order.controller.js, và webhook thanh
// toán ở bước sau) mà không cần biết chi tiết cách đặt tên room ở trên — chỉ cần gọi hàm này.
function emitToUser(io, userId, eventName, payload) {
  io.to(`user_${userId}`).emit(eventName, payload);
}

// Gắn emitToUser làm property của initOrderSocket thay vì đổi module.exports thành 1 object
// { initOrderSocket, emitToUser } — để không phải sửa app.js (đang require file này như 1 hàm
// gọi thẳng: initOrderSocket(io)). Function trong JS vẫn là object nên gắn thêm property được.
module.exports = initOrderSocket;
module.exports.emitToUser = emitToUser;
