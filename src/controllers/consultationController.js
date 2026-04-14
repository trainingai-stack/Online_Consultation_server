const { get, all, run } = require('../utils/db')

const createConsultation = (req, res, next) => {
  try {
    const { doctorId, title, description } = req.body

    if (!doctorId || !title) {
      return res.status(400).json({
        success: false,
        message: '医生ID和问诊标题不能为空'
      })
    }

    const doctor = get('SELECT * FROM doctorProfiles WHERE id = ?', [parseInt(doctorId)])

    if (!doctor || doctor.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: '该医生不可问诊'
      })
    }

    const result = run(`
      INSERT INTO consultations (userId, doctorId, title, description, status)
      VALUES (?, ?, ?, ?, 'PENDING')
    `, [req.user.id, parseInt(doctorId), title, description || ''])

    const consultation = get(`
      SELECT c.*, 
             d.realName as doctorName, u2.avatar as doctorAvatar,
             u.username as userName, u.avatar as userAvatar
      FROM consultations c
      LEFT JOIN doctorProfiles d ON c.doctorId = d.id
      LEFT JOIN users u2 ON d.userId = u2.id
      LEFT JOIN users u ON c.userId = u.id
      WHERE c.id = ?
    `, [result.lastInsertRowid])

    res.status(201).json({
      success: true,
      message: '问诊已发起，等待医生接诊',
      data: { consultation }
    })
  } catch (error) {
    next(error)
  }
}

const getConsultations = (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query
    const skip = (page - 1) * limit

    let whereClause = 'WHERE 1=1'
    const params = []

    if (req.user.role === 'DOCTOR') {
      const doctorProfile = get('SELECT * FROM doctorProfiles WHERE userId = ?', [req.user.id])
      whereClause += ' AND c.doctorId = ?'
      params.push(doctorProfile.id)
    } else {
      whereClause += ' AND c.userId = ?'
      params.push(req.user.id)
    }

    if (status) {
      whereClause += ' AND c.status = ?'
      params.push(status)
    }

    params.push(parseInt(skip), parseInt(limit))

    const consultations = all(`
      SELECT c.*, 
             d.realName as doctorName, u2.avatar as doctorAvatar,
             u.username as userName, u.avatar as userAvatar,
             (SELECT content FROM messages m WHERE m.consultationId = c.id ORDER BY m.createdAt DESC LIMIT 1) as lastMessage
      FROM consultations c
      LEFT JOIN doctorProfiles d ON c.doctorId = d.id
      LEFT JOIN users u2 ON d.userId = u2.id
      LEFT JOIN users u ON c.userId = u.id
      ${whereClause}
      ORDER BY c.createdAt DESC
      LIMIT ?, ?
    `, params)

    const countParams = params.slice(0, -2)
    const total = get(`
      SELECT COUNT(*) as count FROM consultations c
      ${whereClause.replace('LIMIT ?, ?', '')}
    `, countParams).count

    res.json({
      success: true,
      data: {
        consultations,
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

const getConsultationDetail = (req, res, next) => {
  try {
    const { id } = req.params

    const consultation = get(`
      SELECT c.*, 
             d.realName as doctorName, u2.avatar as doctorAvatar,
             u.username as userName, u.avatar as userAvatar
      FROM consultations c
      LEFT JOIN doctorProfiles d ON c.doctorId = d.id
      LEFT JOIN users u2 ON d.userId = u2.id
      LEFT JOIN users u ON c.userId = u.id
      WHERE c.id = ?
    `, [parseInt(id)])

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: '问诊记录不存在'
      })
    }

    if (req.user.role === 'DOCTOR') {
      const doctorProfile = get('SELECT * FROM doctorProfiles WHERE userId = ?', [req.user.id])
      if (consultation.doctorId !== doctorProfile.id) {
        return res.status(403).json({
          success: false,
          message: '无权访问该问诊'
        })
      }
    } else if (consultation.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权访问该问诊'
      })
    }

    const messages = all(`
      SELECT m.*, u.username as senderName, u.avatar as senderAvatar, u.role as senderRole
      FROM messages m
      LEFT JOIN users u ON m.senderId = u.id
      WHERE m.consultationId = ?
      ORDER BY m.createdAt ASC
    `, [parseInt(id)])

    consultation.messages = messages

    res.json({
      success: true,
      data: { consultation }
    })
  } catch (error) {
    next(error)
  }
}

const updateConsultationStatus = (req, res, next) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!['ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值'
      })
    }

    const consultation = get('SELECT * FROM consultations WHERE id = ?', [parseInt(id)])

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: '问诊记录不存在'
      })
    }

    if (req.user.role === 'DOCTOR') {
      const doctorProfile = get('SELECT * FROM doctorProfiles WHERE userId = ?', [req.user.id])
      if (consultation.doctorId !== doctorProfile.id) {
        return res.status(403).json({
          success: false,
          message: '无权操作该问诊'
        })
      }
    } else if (consultation.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权操作该问诊'
      })
    }

    if (status === 'COMPLETED') {
      run(
        "UPDATE consultations SET status = ?, completedAt = CURRENT_TIMESTAMP WHERE id = ?",
        [status, parseInt(id)]
      )
    } else {
      run(
        "UPDATE consultations SET status = ? WHERE id = ?",
        [status, parseInt(id)]
      )
    }

    if (status === 'ACTIVE') {
      run(
        "UPDATE doctorProfiles SET consultationCount = consultationCount + 1 WHERE id = ?",
        [consultation.doctorId]
      )
    }

    const updatedConsultation = get('SELECT * FROM consultations WHERE id = ?', [parseInt(id)])

    res.json({
      success: true,
      message: '问诊状态已更新',
      data: { consultation: updatedConsultation }
    })
  } catch (error) {
    next(error)
  }
}

const sendMessage = (req, res, next) => {
  try {
    const { consultationId } = req.params
    const { content, type = 'text' } = req.body

    if (!content) {
      return res.status(400).json({
        success: false,
        message: '消息内容不能为空'
      })
    }

    const consultation = get('SELECT * FROM consultations WHERE id = ?', [parseInt(consultationId)])

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: '问诊记录不存在'
      })
    }

    if (req.user.role === 'DOCTOR') {
      const doctorProfile = get('SELECT * FROM doctorProfiles WHERE userId = ?', [req.user.id])
      if (consultation.doctorId !== doctorProfile.id) {
        return res.status(403).json({
          success: false,
          message: '无权发送消息'
        })
      }
    } else if (consultation.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权发送消息'
      })
    }

    const result = run(`
      INSERT INTO messages (consultationId, senderId, content, type, isRead)
      VALUES (?, ?, ?, ?, 0)
    `, [parseInt(consultationId), req.user.id, content, type])

    const message = get(`
      SELECT m.*, u.username as senderName, u.avatar as senderAvatar, u.role as senderRole
      FROM messages m
      LEFT JOIN users u ON m.senderId = u.id
      WHERE m.id = ?
    `, [result.lastInsertRowid])

    res.json({
      success: true,
      message: '消息发送成功',
      data: { message }
    })
  } catch (error) {
    next(error)
  }
}

const getMessages = (req, res, next) => {
  try {
    const { consultationId } = req.params
    const { page = 1, limit = 50 } = req.query
    const skip = (page - 1) * limit

    const consultation = get('SELECT * FROM consultations WHERE id = ?', [parseInt(consultationId)])

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: '问诊记录不存在'
      })
    }

    if (req.user.role === 'DOCTOR') {
      const doctorProfile = get('SELECT * FROM doctorProfiles WHERE userId = ?', [req.user.id])
      if (consultation.doctorId !== doctorProfile.id) {
        return res.status(403).json({
          success: false,
          message: '无权访问该消息'
        })
      }
    } else if (consultation.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权访问该消息'
      })
    }

    const messages = all(`
      SELECT m.*, u.username as senderName, u.avatar as senderAvatar, u.role as senderRole
      FROM messages m
      LEFT JOIN users u ON m.senderId = u.id
      WHERE m.consultationId = ?
      ORDER BY m.createdAt DESC
      LIMIT ?, ?
    `, [parseInt(consultationId), parseInt(skip), parseInt(limit)]).reverse()

    const total = get('SELECT COUNT(*) as count FROM messages WHERE consultationId = ?', [parseInt(consultationId)]).count

    run(`
      UPDATE messages SET isRead = 1
      WHERE consultationId = ? AND senderId != ? AND isRead = 0
    `, [parseInt(consultationId), req.user.id])

    res.json({
      success: true,
      data: {
        messages,
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

module.exports = {
  createConsultation,
  getConsultations,
  getConsultationDetail,
  updateConsultationStatus,
  sendMessage,
  getMessages
}
