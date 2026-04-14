const jwt = require('jsonwebtoken');
const ResponseUtil = require('../utils/response');
const prisma = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * JWT认证中间件
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseUtil.unauthorized(res);
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 查询用户信息
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        doctorProfile: true
      }
    });

    if (!user) {
      return ResponseUtil.unauthorized(res, '用户不存在');
    }

    if (user.status === 'INACTIVE') {
      return ResponseUtil.forbidden(res, '账号已被禁用');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ResponseUtil.unauthorized(res, '登录已过期，请重新登录');
    }
    if (error.name === 'JsonWebTokenError') {
      return ResponseUtil.unauthorized(res, '无效的Token');
    }
    return ResponseUtil.unauthorized(res);
  }
};

/**
 * 可选认证中间件 - 有token则解析，无token也能通过
 */
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        doctorProfile: true
      }
    });

    if (user && user.status === 'ACTIVE') {
      req.user = user;
    }
    
    next();
  } catch (error) {
    next();
  }
};

/**
 * 角色验证中间件
 */
const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res);
    }

    if (!roles.includes(req.user.role)) {
      return ResponseUtil.forbidden(res, '无权访问该资源');
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  roleMiddleware,
  JWT_SECRET
};
