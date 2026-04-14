const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');

/**
 * 初始化 Socket.IO
 */
const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // 用户连接映射：userId -> socketId
  const userSockets = new Map();

  // 认证中间件
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          nickname: true,
          avatar: true,
          role: true
        }
      });

      if (!user || user.status === 'INACTIVE') {
        return next(new Error('User not found or inactive'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.id} - ${socket.user.nickname}`);
    
    // 存储用户socket映射
    userSockets.set(socket.user.id, socket.id);
    
    // 加入用户房间
    socket.join(`user_${socket.user.id}`);

    // 获取用户的问诊列表并加入房间
    prisma.consultation.findMany({
      where: {
        OR: [
          { patientId: socket.user.id },
          { doctorId: socket.user.id }
        ],
        status: {
          in: ['PENDING', 'IN_PROGRESS']
        }
      },
      select: {
        id: true
      }
    }).then(consultations => {
      consultations.forEach(c => {
        socket.join(`consultation_${c.id}`);
      });
    });

    // 监听加入问诊房间
    socket.on('join_consultation', async (consultationId) => {
      try {
        const consultation = await prisma.consultation.findUnique({
          where: { id: parseInt(consultationId) }
        });

        if (!consultation) {
          socket.emit('error', { message: '问诊不存在' });
          return;
        }

        // 验证权限
        if (consultation.patientId !== socket.user.id && consultation.doctorId !== socket.user.id) {
          socket.emit('error', { message: '无权加入该问诊' });
          return;
        }

        socket.join(`consultation_${consultationId}`);
        socket.emit('joined', { consultationId });
        
        console.log(`User ${socket.user.id} joined consultation ${consultationId}`);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // 监听离开问诊房间
    socket.on('leave_consultation', (consultationId) => {
      socket.leave(`consultation_${consultationId}`);
      socket.emit('left', { consultationId });
    });

    // 监听发送消息
    socket.on('send_message', async (data) => {
      try {
        const { consultationId, content, type = 'TEXT' } = data;

        // 验证问诊
        const consultation = await prisma.consultation.findUnique({
          where: { id: parseInt(consultationId) }
        });

        if (!consultation) {
          socket.emit('error', { message: '问诊不存在' });
          return;
        }

        // 验证权限
        if (consultation.patientId !== socket.user.id && consultation.doctorId !== socket.user.id) {
          socket.emit('error', { message: '无权发送消息' });
          return;
        }

        // 验证状态
        if (consultation.status === 'CANCELLED') {
          socket.emit('error', { message: '问诊已取消' });
          return;
        }

        if (consultation.status === 'COMPLETED') {
          socket.emit('error', { message: '问诊已结束' });
          return;
        }

        // 创建消息
        const message = await prisma.message.create({
          data: {
            consultationId: parseInt(consultationId),
            senderId: socket.user.id,
            type,
            content
          },
          include: {
            sender: {
              select: {
                id: true,
                nickname: true,
                avatar: true
              }
            }
          }
        });

        // 更新问诊时间
        await prisma.consultation.update({
          where: { id: parseInt(consultationId) },
          data: { updatedAt: new Date() }
        });

        // 广播消息到问诊房间
        io.to(`consultation_${consultationId}`).emit('new_message', message);

        // 通知对方有新消息
        const otherUserId = consultation.patientId === socket.user.id 
          ? consultation.doctorId 
          : consultation.patientId;
        
        const otherSocketId = userSockets.get(otherUserId);
        if (otherSocketId) {
          io.to(otherSocketId).emit('new_notification', {
            type: 'MESSAGE',
            consultationId: parseInt(consultationId),
            message: {
              id: message.id,
              content: message.content,
              sender: message.sender,
              createdAt: message.createdAt
            }
          });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // 监听输入状态
    socket.on('typing', (data) => {
      const { consultationId, isTyping } = data;
      socket.to(`consultation_${consultationId}`).emit('user_typing', {
        userId: socket.user.id,
        isTyping
      });
    });

    // 监听消息已读
    socket.on('mark_read', async (data) => {
      try {
        const { consultationId } = data;

        await prisma.message.updateMany({
          where: {
            consultationId: parseInt(consultationId),
            senderId: { not: socket.user.id },
            isRead: false
          },
          data: { isRead: true }
        });

        // 通知对方消息已读
        socket.to(`consultation_${consultationId}`).emit('messages_read', {
          by: socket.user.id
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // 断开连接
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.id}`);
      userSockets.delete(socket.user.id);
    });
  });

  return io;
};

module.exports = initSocket;
