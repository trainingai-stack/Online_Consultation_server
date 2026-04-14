const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const prisma = require('../config/database');
const ResponseUtil = require('../utils/response');
const { JWT_SECRET } = require('../middleware/auth');

/**
 * 用户注册
 */
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseUtil.badRequest(res, errors.array()[0].msg);
    }

    const { phone, password, nickname } = req.body;

    // 检查手机号是否已注册
    const existingUser = await prisma.user.findUnique({
      where: { phone }
    });

    if (existingUser) {
      return ResponseUtil.error(res, '手机号已注册', 409);
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        phone,
        password: hashedPassword,
        nickname: nickname || `用户${phone.slice(-4)}`
      },
      select: {
        id: true,
        phone: true,
        nickname: true,
        avatar: true,
        role: true,
        status: true,
        createdAt: true
      }
    });

    // 生成JWT
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return ResponseUtil.success(res, {
      user,
      token
    }, '注册成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 用户登录
 */
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseUtil.badRequest(res, errors.array()[0].msg);
    }

    const { phone, password } = req.body;

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { phone },
      include: {
        doctorProfile: {
          include: {
            category: true
          }
        }
      }
    });

    if (!user) {
      return ResponseUtil.error(res, '手机号或密码错误', 401, 401);
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return ResponseUtil.error(res, '手机号或密码错误', 401, 401);
    }

    if (user.status === 'INACTIVE') {
      return ResponseUtil.forbidden(res, '账号已被禁用');
    }

    // 生成JWT
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 移除敏感信息
    const { password: _, ...userWithoutPassword } = user;

    return ResponseUtil.success(res, {
      user: userWithoutPassword,
      token
    }, '登录成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 获取当前用户信息
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        doctorProfile: {
          include: {
            category: true
          }
        }
      }
    });

    if (!user) {
      return ResponseUtil.notFound(res, '用户不存在');
    }

    const { password, ...userWithoutPassword } = user;

    return ResponseUtil.success(res, userWithoutPassword);
  } catch (error) {
    next(error);
  }
};

/**
 * 更新用户信息
 */
const updateProfile = async (req, res, next) => {
  try {
    const { nickname } = req.body;
    const updateData = {};

    if (nickname) updateData.nickname = nickname;

    // 处理头像上传
    if (req.file) {
      updateData.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        phone: true,
        nickname: true,
        avatar: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return ResponseUtil.success(res, user, '更新成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 修改密码
 */
const changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseUtil.badRequest(res, errors.array()[0].msg);
    }

    const { oldPassword, newPassword } = req.body;

    // 验证旧密码
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return ResponseUtil.error(res, '原密码错误', 400);
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    return ResponseUtil.success(res, null, '密码修改成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 选择角色（成为医生）
 */
const selectRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!['USER', 'DOCTOR'].includes(role)) {
      return ResponseUtil.badRequest(res, '无效的角色');
    }

    // 如果要成为医生，检查是否已有资质
    if (role === 'DOCTOR') {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: req.user.id }
      });

      if (!doctorProfile) {
        return ResponseUtil.error(res, '请先提交医生资质认证', 400);
      }

      if (doctorProfile.verifyStatus !== 'APPROVED') {
        return ResponseUtil.error(res, '医生资质审核中或未通过', 400);
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { role },
      select: {
        id: true,
        phone: true,
        nickname: true,
        avatar: true,
        role: true,
        status: true
      }
    });

    // 重新生成token
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return ResponseUtil.success(res, { user, token }, '角色切换成功');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  updateProfile,
  changePassword,
  selectRole
};
