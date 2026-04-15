import express from 'express';
import prisma from '../db/prismaClient.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { consultationId, content, type = 'text' } = req.body;
    if (!consultationId || !content) {
      return res.status(400).json({ success: false, message: '问诊ID和消息内容不能为空' });
    }
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId }
    });
    if (!consultation) {
      return res.status(404).json({ success: false, message: '问诊不存在' });
    }
    if (consultation.userId !== req.user.id && consultation.doctorId !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权发送消息' });
    }
    if (consultation.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: '问诊未开始或已结束' });
    }
    const receiverId = consultation.userId === req.user.id ? consultation.doctorId : consultation.userId;
    const message = await prisma.message.create({
      data: {
        consultationId,
        senderId: req.user.id,
        receiverId,
        content,
        type
      },
      include: {
        sender: { select: { id: true, nickname: true, avatar: true } }
      }
    });
    res.json({
      success: true,
      message: '发送成功',
      data: message
    });
  } catch (error) {
    console.error('发送消息错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/:consultationId', authMiddleware, async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { beforeId, limit = 50 } = req.query;
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId }
    });
    if (!consultation) {
      return res.status(404).json({ success: false, message: '问诊不存在' });
    }
    if (consultation.userId !== req.user.id && consultation.doctorId !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权查看消息' });
    }
    const where = { consultationId };
    if (beforeId) {
      where.id = { lt: beforeId };
    }
    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: { select: { id: true, nickname: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });
    res.json({
      success: true,
      data: messages.reverse()
    });
  } catch (error) {
    console.error('获取消息列表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/read/:consultationId', authMiddleware, async (req, res) => {
  try {
    const { consultationId } = req.params;
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId }
    });
    if (!consultation) {
      return res.status(404).json({ success: false, message: '问诊不存在' });
    }
    await prisma.message.updateMany({
      where: {
        consultationId,
        receiverId: req.user.id,
        isRead: false
      },
      data: { isRead: true }
    });
    res.json({
      success: true,
      message: '已标记为已读'
    });
  } catch (error) {
    console.error('标记已读错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/unread/count', authMiddleware, async (req, res) => {
  try {
    const count = await prisma.message.count({
      where: {
        receiverId: req.user.id,
        isRead: false
      }
    });
    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('获取未读消息数错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
