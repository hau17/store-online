// Socket.io-client instance dùng chung cho toàn app (singleton) — import file này ở đâu cũng
// nhận lại đúng 1 kết nối duy nhất, không tạo connection mới mỗi lần import.
// Kết nối ngay khi app khởi động (autoConnect mặc định), nhưng chỉ thật sự join đúng room của user
// sau khi đăng nhập (xem auth.store.js) — trước đó server chỉ thấy 1 socket "vô danh" đã connect.
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

const socket = io(SOCKET_URL);

export default socket;
