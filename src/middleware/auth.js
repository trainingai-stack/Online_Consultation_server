const jwt = require('jsonwebtoken')
const { get } = require('../utils/db')

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: '未提供认证令牌' 
      })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    const user = get(
      'SELECT id, username, email, role, avatar FROM users WHERE id = ?',
      [decoded.userId]
    )

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: '用户不存在' 
      })
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: '无效的认证令牌' 
      })
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: '认证令牌已过期' 
      })
    }
    next(error)
  }
}

const doctorAuthMiddleware = (req, res, next) => {
  if (req.user.role !== 'DOCTOR') {
    return res.status(403).json({ 
      success: false, 
      message: '需要医生权限' 
    })
  }
  next()
}

const adminAuthMiddleware = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ 
      success: false, 
      message: '需要管理员权限' 
    })
  }
  next()
}

module.exports = { 
  authMiddleware, 
  doctorAuthMiddleware, 
  adminAuthMiddleware 
}
