const ResponseUtil = require('../utils/response');

/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Prisma错误处理
  if (err.code) {
    switch (err.code) {
      case 'P2002':
        const field = err.meta?.target?.[0] || '字段';
        return ResponseUtil.error(res, `${field} 已存在`, 409);
      case 'P2025':
        return ResponseUtil.notFound(res, '记录不存在');
      case 'P2003':
        return ResponseUtil.error(res, '关联记录不存在', 400);
      default:
        break;
    }
  }

  // 验证错误
  if (err.name === 'ValidationError') {
    return ResponseUtil.badRequest(res, err.message);
  }

  // 默认错误响应
  const message = process.env.NODE_ENV === 'production' 
    ? '服务器内部错误' 
    : err.message;
    
  return ResponseUtil.error(res, message, 500);
};

/**
 * 404处理中间件
 */
const notFoundHandler = (req, res) => {
  return ResponseUtil.notFound(res, '接口不存在');
};

module.exports = {
  errorHandler,
  notFoundHandler
};
