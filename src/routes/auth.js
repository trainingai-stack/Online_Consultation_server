import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db/prismaClient.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { phone, password, nickname } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ success: false, message: '手机号和密码不能为空' });
    }
    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: '该手机号已注册' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        phone,
        password: hashedPassword,
        nickname: nickname || `用户${phone.slice(-4)}`
      }
    });
    const token = generateToken({ id: user.id, phone: user.phone, role: user.role });
    res.json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          avatar: user.avatar,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ success: false, message: '手机号和密码不能为空' });
    }
    const user = await prisma.user.findUnique({
      where: { phone },
      include: { doctorProfile: true }
    });
    if (!user) {
      return res.status(400).json({ success: false, message: '用户不存在' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: '密码错误' });
    }
    const token = generateToken({ id: user.id, phone: user.phone, role: user.role });
    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          avatar: user.avatar,
          role: user.role,
          doctorProfile: user.doctorProfile
        }
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        doctorProfile: {
          include: { category: true }
        },
        qualifications: true
      }
    });
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.json({
      success: true,
      data: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role,
        doctorProfile: user.doctorProfile,
        qualifications: user.qualifications
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { nickname, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { nickname, avatar }
    });
    res.json({
      success: true,
      message: '更新成功',
      data: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role
      }
    });
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/become-doctor', authMiddleware, async (req, res) => {
  try {
    const { categoryId, title, hospital, department, introduction, specialty, consultationFee } = req.body;
    if (!categoryId) {
      return res.status(400).json({ success: false, message: '请选择医生分类' });
    }
    const existingProfile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user.id }
    });
    if (existingProfile) {
      return res.status(400).json({ success: false, message: '您已经是医生了' });
    }
    const doctorProfile = await prisma.doctorProfile.create({
      data: {
        userId: req.user.id,
        categoryId,
        title,
        hospital,
        department,
        introduction,
        specialty,
        consultationFee: parseFloat(consultationFee) || 0,
        isVerified: true
      },
      include: { category: true }
    });
    await prisma.user.update({
      where: { id: req.user.id },
      data: { role: 'DOCTOR' }
    });
    const token = generateToken({ id: req.user.id, phone: req.user.phone, role: 'DOCTOR' });
    res.json({
      success: true,
      message: '申请成为医生成功，请等待资质审核',
      data: {
        doctorProfile,
        token
      }
    });
  } catch (error) {
    console.error('成为医生错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/doctor-profile', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'DOCTOR') {
      return res.status(403).json({ success: false, message: '只有医生才能更新医生资料' });
    }
    const { categoryId, title, hospital, department, introduction, specialty, consultationFee } = req.body;
    const doctorProfile = await prisma.doctorProfile.update({
      where: { userId: req.user.id },
      data: {
        categoryId,
        title,
        hospital,
        department,
        introduction,
        specialty,
        consultationFee: consultationFee !== undefined ? parseFloat(consultationFee) : undefined
      },
      include: { category: true }
    });
    res.json({
      success: true,
      message: '医生资料更新成功',
      data: doctorProfile
    });
  } catch (error) {
    console.error('更新医生资料错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/set-online', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'DOCTOR') {
      return res.status(403).json({ success: false, message: '只有医生才能设置在线状态' });
    }
    const { isOnline } = req.body;
    await prisma.doctorProfile.update({
      where: { userId: req.user.id },
      data: { isOnline: !!isOnline }
    });
    res.json({
      success: true,
      message: isOnline ? '已上线' : '已下线'
    });
  } catch (error) {
    console.error('设置在线状态错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
