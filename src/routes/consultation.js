import express from 'express';
import prisma from '../db/prismaClient.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { doctorId, chiefComplaint } = req.body;
    if (!doctorId) {
      return res.status(400).json({ success: false, message: '请选择医生' });
    }
    const doctor = await prisma.doctorProfile.findUnique({
      where: { userId: doctorId },
      include: { user: true }
    });
    if (!doctor || !doctor.isVerified) {
      return res.status(400).json({ success: false, message: '医生不存在或未认证' });
    }
    const activeConsultation = await prisma.consultation.findFirst({
      where: {
        userId: req.user.id,
        doctorId,
        status: { in: ['PENDING', 'ACTIVE'] }
      }
    });
    if (activeConsultation) {
      return res.status(400).json({
        success: false,
        message: '已有进行中的问诊',
        data: activeConsultation
      });
    }
    const consultation = await prisma.consultation.create({
      data: {
        userId: req.user.id,
        doctorId,
        chiefComplaint,
        status: 'PENDING'
      },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        doctor: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            doctorProfile: true
          }
        }
      }
    });
    res.json({
      success: true,
      message: '问诊创建成功',
      data: consultation
    });
  } catch (error) {
    console.error('创建问诊错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/:id/accept', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const consultation = await prisma.consultation.findUnique({
      where: { id }
    });
    if (!consultation) {
      return res.status(404).json({ success: false, message: '问诊不存在' });
    }
    if (consultation.doctorId !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权操作' });
    }
    if (consultation.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: '问诊状态不允许' });
    }
    const updated = await prisma.consultation.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        startedAt: new Date()
      },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        doctor: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            doctorProfile: true
          }
        }
      }
    });
    res.json({
      success: true,
      message: '已接受问诊',
      data: updated
    });
  } catch (error) {
    console.error('接受问诊错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { diagnosis, prescription } = req.body;
    const consultation = await prisma.consultation.findUnique({
      where: { id }
    });
    if (!consultation) {
      return res.status(404).json({ success: false, message: '问诊不存在' });
    }
    if (consultation.doctorId !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权操作' });
    }
    if (consultation.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: '问诊状态不允许' });
    }
    const updated = await prisma.consultation.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        diagnosis,
        prescription,
        endedAt: new Date()
      },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        doctor: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            doctorProfile: true
          }
        }
      }
    });
    await prisma.doctorProfile.update({
      where: { userId: consultation.doctorId },
      data: {
        consultationCount: { increment: 1 }
      }
    });
    res.json({
      success: true,
      message: '问诊已完成',
      data: updated
    });
  } catch (error) {
    console.error('完成问诊错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const consultation = await prisma.consultation.findUnique({
      where: { id }
    });
    if (!consultation) {
      return res.status(404).json({ success: false, message: '问诊不存在' });
    }
    if (consultation.userId !== req.user.id && consultation.doctorId !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权操作' });
    }
    if (!['PENDING', 'ACTIVE'].includes(consultation.status)) {
      return res.status(400).json({ success: false, message: '问诊状态不允许取消' });
    }
    const updated = await prisma.consultation.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        endedAt: new Date()
      }
    });
    res.json({
      success: true,
      message: '问诊已取消',
      data: updated
    });
  } catch (error) {
    console.error('取消问诊错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/:id/rate', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: '请提供1-5的评分' });
    }
    const consultation = await prisma.consultation.findUnique({
      where: { id }
    });
    if (!consultation) {
      return res.status(404).json({ success: false, message: '问诊不存在' });
    }
    if (consultation.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: '只有用户才能评价' });
    }
    if (consultation.status !== 'COMPLETED') {
      return res.status(400).json({ success: false, message: '只能评价已完成的问诊' });
    }
    if (consultation.rating) {
      return res.status(400).json({ success: false, message: '已评价过' });
    }
    const updated = await prisma.consultation.update({
      where: { id },
      data: { rating, review }
    });
    const ratings = await prisma.consultation.aggregate({
      where: {
        doctorId: consultation.doctorId,
        rating: { not: null }
      },
      _avg: { rating: true }
    });
    await prisma.doctorProfile.update({
      where: { userId: consultation.doctorId },
      data: { rating: ratings._avg.rating || 5 }
    });
    res.json({
      success: true,
      message: '评价成功',
      data: updated
    });
  } catch (error) {
    console.error('评价问诊错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const consultation = await prisma.consultation.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        doctor: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            doctorProfile: { include: { category: true } }
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, nickname: true, avatar: true } }
          }
        }
      }
    });
    if (!consultation) {
      return res.status(404).json({ success: false, message: '问诊不存在' });
    }
    if (consultation.userId !== req.user.id && consultation.doctorId !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权查看' });
    }
    res.json({
      success: true,
      data: consultation
    });
  } catch (error) {
    console.error('获取问诊详情错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, role, page = 1, pageSize = 10 } = req.query;
    const where = {};
    if (role === 'doctor') {
      where.doctorId = req.user.id;
    } else {
      where.userId = req.user.id;
    }
    if (status) {
      where.status = status;
    }
    const total = await prisma.consultation.count({ where });
    const consultations = await prisma.consultation.findMany({
      where,
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        doctor: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            doctorProfile: { include: { category: true } }
          }
        },
        _count: { select: { messages: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(pageSize),
      take: parseInt(pageSize)
    });
    res.json({
      success: true,
      data: {
        list: consultations.map(c => ({
          ...c,
          messageCount: c._count.messages
        })),
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize))
      }
    });
  } catch (error) {
    console.error('获取问诊列表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/pending/list', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'DOCTOR') {
      return res.status(403).json({ success: false, message: '只有医生才能查看待处理问诊' });
    }
    const consultations = await prisma.consultation.findMany({
      where: {
        doctorId: req.user.id,
        status: 'PENDING'
      },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json({
      success: true,
      data: consultations
    });
  } catch (error) {
    console.error('获取待处理问诊错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
