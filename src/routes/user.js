import express from 'express';
import prisma from '../db/prismaClient.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/records', authMiddleware, async (req, res) => {
  try {
    const { type = 'user', page = 1, pageSize = 10 } = req.query;
    const where = {};
    if (type === 'doctor' && req.user.role === 'DOCTOR') {
      where.doctorId = req.user.id;
    } else {
      where.userId = req.user.id;
    }
    const total = await prisma.consultation.count({ where });
    const records = await prisma.consultation.findMany({
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
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(pageSize),
      take: parseInt(pageSize)
    });
    res.json({
      success: true,
      data: {
        list: records,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize))
      }
    });
  } catch (error) {
    console.error('获取问诊记录错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const stats = {};
    if (req.user.role === 'DOCTOR') {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: req.user.id }
      });
      const totalConsultations = await prisma.consultation.count({
        where: { doctorId: req.user.id }
      });
      const completedConsultations = await prisma.consultation.count({
        where: { doctorId: req.user.id, status: 'COMPLETED' }
      });
      const activeConsultations = await prisma.consultation.count({
        where: { doctorId: req.user.id, status: 'ACTIVE' }
      });
      const pendingConsultations = await prisma.consultation.count({
        where: { doctorId: req.user.id, status: 'PENDING' }
      });
      const avgRating = await prisma.consultation.aggregate({
        where: {
          doctorId: req.user.id,
          rating: { not: null }
        },
        _avg: { rating: true }
      });
      stats.doctor = {
        totalConsultations,
        completedConsultations,
        activeConsultations,
        pendingConsultations,
        rating: avgRating._avg.rating || doctorProfile?.rating || 5,
        consultationCount: doctorProfile?.consultationCount || 0
      };
    }
    const userTotalConsultations = await prisma.consultation.count({
      where: { userId: req.user.id }
    });
    const userCompletedConsultations = await prisma.consultation.count({
      where: { userId: req.user.id, status: 'COMPLETED' }
    });
    const userActiveConsultations = await prisma.consultation.count({
      where: { userId: req.user.id, status: 'ACTIVE' }
    });
    stats.user = {
      totalConsultations: userTotalConsultations,
      completedConsultations: userCompletedConsultations,
      activeConsultations: userActiveConsultations
    };
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取统计数据错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/qualifications', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'DOCTOR') {
      return res.status(403).json({ success: false, message: '只有医生才能查看资质' });
    }
    const qualifications = await prisma.qualification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json({
      success: true,
      data: qualifications
    });
  } catch (error) {
    console.error('获取资质列表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
