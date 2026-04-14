const errorHandler = (err, req, res, next) => {
  console.error(err.stack)

  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || '字段'
    return res.status(400).json({
      success: false,
      message: `${field}已存在，请使用其他值`
    })
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: '记录不存在'
    })
  }

  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      message: '关联数据不存在'
    })
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || '服务器内部错误'
  })
}

const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  })
}

module.exports = { errorHandler, notFoundHandler }
