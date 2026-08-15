// Entry point của backend: khởi tạo Express app, gắn middleware, mount route, setup Socket.io.
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const env = require('./config/env');
const pool = require('./config/db');
const { success, error } = require('./utils/response');
const errorMiddleware = require('./middlewares/error.middleware');
const initOrderSocket = require('./sockets/orderSocket');

const authRoutes = require('./routes/auth.routes');
const categoryRoutes = require('./routes/category.routes');
const authorRoutes = require('./routes/author.routes');
const publisherRoutes = require('./routes/publisher.routes');
const bookRoutes = require('./routes/book.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const paymentRoutes = require('./routes/payment.routes');
const supplierRoutes = require('./routes/supplier.routes');
const stockImportRoutes = require('./routes/stockImport.routes');

const app = express();

// CORS: chỉ cho phép frontend (FRONTEND_URL trong .env) gọi API
app.use(cors({ origin: env.FRONTEND_URL }));

// Đọc JSON body của request (req.body)
app.use(express.json());

// Route test kết nối MySQL: query "SELECT 1" đơn giản, nếu chạy được nghĩa là pool kết nối DB ổn.
app.get('/api/health/db', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS result');
    success(res, { message: 'Kết nối MySQL thành công', data: { result: rows[0].result } });
  } catch (err) {
    next(err);
  }
});

// Mount các route theo prefix /api/...
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/authors', authorRoutes);
app.use('/api/publishers', publisherRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/webhook', paymentRoutes); // POST /api/webhook/sepay
app.use('/api/suppliers', supplierRoutes);
app.use('/api/stock-imports', stockImportRoutes);

// Route không khớp path nào ở trên -> 404
app.use((req, res) => {
  error(res, { message: 'Không tìm thấy endpoint', errorCode: 'NOT_FOUND', statusCode: 404 });
});

// Middleware xử lý lỗi tập trung -> LUÔN mount cuối cùng
app.use(errorMiddleware);

// Bọc app bằng http server thuần để gắn Socket.io vào chung 1 port với Express
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: env.FRONTEND_URL },
});
initOrderSocket(io);

// Cho các controller khác (vd payment webhook) lấy io ra để emit event qua req.app.get('io')
app.set('io', io);

httpServer.listen(env.PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${env.PORT}`);
});
