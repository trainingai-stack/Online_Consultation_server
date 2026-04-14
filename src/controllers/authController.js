const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { db, get, run } = require('../utils/db')

const register = (req, res, next) => {
  try {
    const { username, email, password, role } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名、邮箱和密码不能为空'
      })
    }

    const existingUser = get('SELECT * FROM users WHERE email = ? OR username = ?', [email, username])
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名或邮箱已存在'
      })
    }

    const hashedPassword = bcrypt.hashSync(password, 10)
    const userRole = role === 'DOCTOR' ? 'DOCTOR' : 'USER'

    const result = run(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, userRole]
    )

    const user = {
      id: result.lastInsertRowid,
      username,
      email,
      role: userRole,
      avatar: null,
      createdAt: new Date().toISOString()
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user,
        token
      }
    })
  } catch (error) {
    next(error)
  }
}

const login = (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '邮箱和密码不能为空'
      })
    }

    const user = get('SELECT * FROM users WHERE email = ?', [email])

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      })
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      })
    }

    const doctorProfile = get('SELECT * FROM doctorProfiles WHERE userId = ?', [user.id])
    user.doctorProfile = doctorProfile || null

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    const { password: _, ...userWithoutPassword } = user

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: userWithoutPassword,
        token
      }
    })
  } catch (error) {
    next(error)
  }
}

const getCurrentUser = (req, res, next) => {
  try {
    const user = get(
      'SELECT id, username, email, role, avatar, phone, createdAt FROM users WHERE id = ?',
      [req.user.id]
    )
    const doctorProfile = get('SELECT * FROM doctorProfiles WHERE userId = ?', [user.id])
    user.doctorProfile = doctorProfile || null

    res.json({
      success: true,
      data: { user }
    })
  } catch (error) {
    next(error)
  }
}

const updateProfile = (req, res, next) => {
  try {
    const { username, avatar, phone } = req.body

    run(
      'UPDATE users SET username = ?, avatar = ?, phone = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [username, avatar, phone, req.user.id]
    )

    const user = get(
      'SELECT id, username, email, role, avatar, phone, updatedAt FROM users WHERE id = ?',
      [req.user.id]
    )

    res.json({
      success: true,
      message: '更新成功',
      data: { user }
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  register,
  login,
  getCurrentUser,
  updateProfile
}
