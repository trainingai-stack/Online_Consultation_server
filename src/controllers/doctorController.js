const { get, all, run } = require('../utils/db')

const getDoctors = (req, res, next) => {
  try {
    const { categoryId, page = 1, limit = 10 } = req.query
    const skip = (page - 1) * limit

    let whereClause = "WHERE dp.status = 'APPROVED'"
    const params = []

    if (categoryId) {
      whereClause += ' AND dp.categoryId = ?'
      params.push(parseInt(categoryId))
    }

    params.push(parseInt(skip), parseInt(limit))

    const doctors = all(`
      SELECT dp.*, u.username, u.avatar, c.name as categoryName
      FROM doctorProfiles dp
      LEFT JOIN users u ON dp.userId = u.id
      LEFT JOIN categories c ON dp.categoryId = c.id
      ${whereClause}
      ORDER BY dp.consultationCount DESC, dp.rating DESC
      LIMIT ?, ?
    `, params)

    const totalParams = categoryId ? [parseInt(categoryId)] : []
    const total = get(`
      SELECT COUNT(*) as count FROM doctorProfiles dp
      WHERE dp.status = 'APPROVED'
      ${categoryId ? ' AND dp.categoryId = ?' : ''}
    `, totalParams).count

    res.json({
      success: true,
      data: {
        doctors,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    next(error)
  }
}

const getDoctorDetail = (req, res, next) => {
  try {
    const { id } = req.params

    const doctor = get(`
      SELECT dp.*, u.username, u.avatar, u.email, c.name as categoryName
      FROM doctorProfiles dp
      LEFT JOIN users u ON dp.userId = u.id
      LEFT JOIN categories c ON dp.categoryId = c.id
      WHERE dp.id = ?
    `, [parseInt(id)])

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: '医生不存在'
      })
    }

    res.json({
      success: true,
      data: { doctor }
    })
  } catch (error) {
    next(error)
  }
}

const submitDoctorProfile = (req, res, next) => {
  try {
    const { categoryId, realName, title, hospital, expertise, description } = req.body

    if (!categoryId || !realName || !title || !hospital || !expertise) {
      return res.status(400).json({
        success: false,
        message: '请填写完整的资质信息'
      })
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传资质证明文件'
      })
    }

    const existingProfile = get('SELECT * FROM doctorProfiles WHERE userId = ?', [req.user.id])
    const certificate = `/uploads/${req.file.filename}`

    let doctorProfile
    if (existingProfile) {
      run(`
        UPDATE doctorProfiles 
        SET categoryId = ?, realName = ?, title = ?, hospital = ?, expertise = ?, description = ?, 
            certificate = ?, status = 'PENDING', updatedAt = CURRENT_TIMESTAMP
        WHERE userId = ?
      `, [parseInt(categoryId), realName, title, hospital, expertise, description, certificate, req.user.id])
      
      doctorProfile = get('SELECT * FROM doctorProfiles WHERE userId = ?', [req.user.id])
    } else {
      const result = run(`
        INSERT INTO doctorProfiles (userId, categoryId, realName, title, hospital, expertise, description, certificate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [req.user.id, parseInt(categoryId), realName, title, hospital, expertise, description, certificate])
      
      run("UPDATE users SET role = 'DOCTOR' WHERE id = ?", [req.user.id])
      
      doctorProfile = get('SELECT * FROM doctorProfiles WHERE id = ?', [result.lastInsertRowid])
    }

    res.json({
      success: true,
      message: '资质已提交，等待审核',
      data: { doctorProfile }
    })
  } catch (error) {
    next(error)
  }
}

const getMyDoctorProfile = (req, res, next) => {
  try {
    const doctorProfile = get(`
      SELECT dp.*, c.name as categoryName, u.username, u.avatar, u.email
      FROM doctorProfiles dp
      LEFT JOIN categories c ON dp.categoryId = c.id
      LEFT JOIN users u ON dp.userId = u.id
      WHERE dp.userId = ?
    `, [req.user.id])

    res.json({
      success: true,
      data: { doctorProfile }
    })
  } catch (error) {
    next(error)
  }
}

const reviewDoctor = (req, res, next) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的审核状态'
      })
    }

    run(
      "UPDATE doctorProfiles SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
      [status, parseInt(id)]
    )

    const doctorProfile = get('SELECT * FROM doctorProfiles WHERE id = ?', [parseInt(id)])

    res.json({
      success: true,
      message: status === 'APPROVED' ? '医生资质已通过' : '医生资质已拒绝',
      data: { doctorProfile }
    })
  } catch (error) {
    next(error)
  }
}

const getPendingDoctors = (req, res, next) => {
  try {
    const doctors = all(`
      SELECT dp.*, u.username, u.email, u.avatar, c.name as categoryName
      FROM doctorProfiles dp
      LEFT JOIN users u ON dp.userId = u.id
      LEFT JOIN categories c ON dp.categoryId = c.id
      WHERE dp.status = 'PENDING'
      ORDER BY dp.createdAt DESC
    `)

    res.json({
      success: true,
      data: { doctors }
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getDoctors,
  getDoctorDetail,
  submitDoctorProfile,
  getMyDoctorProfile,
  reviewDoctor,
  getPendingDoctors
}
