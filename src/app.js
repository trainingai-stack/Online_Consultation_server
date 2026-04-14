const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
require('dotenv').config();

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { uploadErrorHandler } = require('./middleware/upload');
const initSocket = require('./socket');

// 路由
const authRoutes = require('./routes/auth');
const doctorRoutes = require('./routes/doctors');
const consultationRoutes = require('./routes/consultations');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    code: 200,
    message: '服务运行正常',
    data: {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    },
    success: true
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

// 上传错误处理
app.use(uploadErrorHandler);

// 404处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

// 创建HTTP服务器
const server = http.createServer(app);

// 初始化Socket.IO
const io = initSocket(server);

// 启动服务器
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║     🏥 P2P线上问诊服务已启动                           ║
║                                                        ║
║     📡 HTTP 服务: http://localhost:${PORT}              ║
║     🔌 WebSocket 服务: ws://localhost:${PORT}           ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, io };
