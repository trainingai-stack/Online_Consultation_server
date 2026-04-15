import express from 'express';
import prisma from '../db/prismaClient.js';
import { authMiddleware } from '../middleware/auth.js';
import upload from '../utils/upload.js';

const router = express.Router();

router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.doctorCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { doctors: true } }
      }
    });
    res.json({
      success: true,
      data: categories.map(c => ({
        ...c,
        doctorCount: c._count.doctors
      }))
    });
  } catch (error) {
    console.error('获取分类错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name, description, icon, sortOrder } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: '分类名称不能为空' });
    }
    const category = await prisma.doctorCategory.create({
      data: { name, description, icon, sortOrder: sortOrder || 0 }
    });
    res.json({
      success: true,
      message: '分类创建成功',
      data: category
    });
  } catch (error) {
    console.error('创建分类错误:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: '分类名称已存在' });
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/list', async (req, res) => {
  try {
    const { categoryId, keyword, isOnline, page = 1, pageSize = 10 } = req.query;
    const where = {
      isVerified: true
    };
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (isOnline !== undefined) {
      where.isOnline = isOnline === 'true';
    }
    if (keyword) {
      where.OR = [
        { user: { nickname: { contains: keyword } } },
        { hospital: { contains: keyword } },
        { department: { contains: keyword } },
        { specialty: { contains: keyword } }
      ];
    }
    const total = await prisma.doctorProfile.count({ where });
    const doctors = await prisma.doctorProfile.findMany({
      where,
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        category: true
      },
      orderBy: [
        { isOnline: 'desc' },
        { rating: 'desc' },
        { consultationCount: 'desc' }
      ],
      skip: (parseInt(page) - 1) * parseInt(pageSize),
      take: parseInt(pageSize)
    });
    res.json({
      success: true,
      data: {
        list: doctors,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize))
      }
    });
  } catch (error) {
    console.error('获取医生列表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await prisma.doctorProfile.findFirst({
      where: {
        OR: [
          { id },
          { userId: id }
        ]
      },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        category: true
      }
    });
    if (!doctor) {
      return res.status(404).json({ success: false, message: '医生不存在' });
    }
    res.json({
      success: true,
      data: doctor
    });
  } catch (error) {
    console.error('获取医生详情错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/qualification', authMiddleware, upload.single('certificate'), async (req, res) => {
  try {
    if (req.user.role !== 'DOCTOR') {
      return res.status(403).json({ success: false, message: '只有医生才能上传资质' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传资质证书图片' });
    }
    const { type, certificateNo } = req.body;
    if (!type) {
      return res.status(400).json({ success: false, message: '请填写资质类型' });
    }
    const qualification = await prisma.qualification.create({
      data: {
        userId: req.user.id,
        type,
        certificateNo,
        certificateImage: `/uploads/${req.file.filename}`
      }
    });
    res.json({
      success: true,
      message: '资质上传成功，等待审核',
      data: qualification
    });
  } catch (error) {
    console.error('上传资质错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/qualifications/list', authMiddleware, async (req, res) => {
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

router.post('/qualification/:id/review', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNote } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: '无效的审核状态' });
    }
    const qualification = await prisma.qualification.update({
      where: { id },
      data: {
        status,
        reviewNote,
        reviewedAt: new Date()
      }
    });
    if (status === 'APPROVED') {
      const qual = await prisma.qualification.findUnique({
        where: { id },
        select: { userId: true }
      });
      const approvedCount = await prisma.qualification.count({
        where: { userId: qual.userId, status: 'APPROVED' }
      });
      if (approvedCount >= 1) {
        await prisma.doctorProfile.update({
          where: { userId: qual.userId },
          data: { isVerified: true }
        });
      }
    }
    res.json({
      success: true,
      message: status === 'APPROVED' ? '资质已通过' : '资质已拒绝',
      data: qualification
    });
  } catch (error) {
    console.error('审核资质错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
