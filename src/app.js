import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './db/prismaClient.js';
import { verifyToken } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const authRoutes = (await import('./routes/auth.js')).default;
const doctorRoutes = (await import('./routes/doctor.js')).default;
const consultationRoutes = (await import('./routes/consultation.js')).default;
const messageRoutes = (await import('./routes/message.js')).default;
const userRoutes = (await import('./routes/user.js')).default;

app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/user', userRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '服务运行中', timestamp: new Date().toISOString() });
});

const userSockets = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return next(new Error('Authentication error'));
  }
  socket.userId = decoded.id;
  socket.userRole = decoded.role;
  next();
});

io.on('connection', async (socket) => {
  console.log(`用户 ${socket.userId} 已连接`);
  userSockets.set(socket.userId, socket.id);
  
  try {
    if (socket.userRole === 'DOCTOR') {
      await prisma.doctorProfile.update({
        where: { userId: socket.userId },
        data: { isOnline: true }
      });
      io.emit('doctor:online', { doctorId: socket.userId });
    }
  } catch (error) {
    console.error('更新在线状态错误:', error);
  }

  socket.on('join:consultation', (consultationId) => {
    socket.join(`consultation:${consultationId}`);
    console.log(`用户 ${socket.userId} 加入问诊 ${consultationId}`);
  });

  socket.on('leave:consultation', (consultationId) => {
    socket.leave(`consultation:${consultationId}`);
    console.log(`用户 ${socket.userId} 离开问诊 ${consultationId}`);
  });

  socket.on('message:send', async (data) => {
    try {
      const { consultationId, content, type = 'text' } = data;
      const consultation = await prisma.consultation.findUnique({
        where: { id: consultationId }
      });
      if (!consultation || consultation.status !== 'ACTIVE') {
        socket.emit('error', { message: '问诊未开始或已结束' });
        return;
      }
      const receiverId = consultation.userId === socket.userId ? consultation.doctorId : consultation.userId;
      const message = await prisma.message.create({
        data: {
          consultationId,
          senderId: socket.userId,
          receiverId,
          content,
          type
        },
        include: {
          sender: { select: { id: true, nickname: true, avatar: true } }
        }
      });
      io.to(`consultation:${consultationId}`).emit('message:received', message);
      const receiverSocketId = userSockets.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('notification:message', {
          consultationId,
          senderId: socket.userId,
          content
        });
      }
    } catch (error) {
      console.error('发送消息错误:', error);
      socket.emit('error', { message: '发送消息失败' });
    }
  });

  socket.on('typing', (data) => {
    const { consultationId, isTyping } = data;
    socket.to(`consultation:${consultationId}`).emit('typing', {
      userId: socket.userId,
      isTyping
    });
  });

  socket.on('disconnect', async () => {
    console.log(`用户 ${socket.userId} 已断开连接`);
    userSockets.delete(socket.userId);
    try {
      if (socket.userRole === 'DOCTOR') {
        await prisma.doctorProfile.update({
          where: { userId: socket.userId },
          data: { isOnline: false }
        });
        io.emit('doctor:offline', { doctorId: socket.userId });
      }
    } catch (error) {
      console.error('更新离线状态错误:', error);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务已启动: http://localhost:${PORT}`);
});

export { app, server, io };
