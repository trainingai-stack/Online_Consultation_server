/**
 * 统一响应格式工具
 */

class ResponseUtil {
  /**
   * 成功响应
   */
  static success(res, data = null, message = '操作成功') {
    return res.json({
      code: 200,
      message,
      data,
      success: true
    });
  }

  /**
   * 错误响应
   */
  static error(res, message = '操作失败', code = 500, statusCode = 200) {
    return res.status(statusCode).json({
      code,
      message,
      data: null,
      success: false
    });
  }

  /**
   * 参数错误
   */
  static badRequest(res, message = '参数错误') {
    return this.error(res, message, 400, 400);
  }

  /**
   * 未授权
   */
  static unauthorized(res, message = '未授权，请先登录') {
    return this.error(res, message, 401, 401);
  }

  /**
   * 禁止访问
   */
  static forbidden(res, message = '无权访问') {
    return this.error(res, message, 403, 403);
  }

  /**
   * 资源不存在
   */
  static notFound(res, message = '资源不存在') {
    return this.error(res, message, 404, 404);
  }

  /**
   * 分页响应
   */
  static paginate(res, list, pagination) {
    return res.json({
      code: 200,
      message: '获取成功',
      data: {
        list,
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          totalPages: Math.ceil(pagination.total / pagination.pageSize)
        }
      },
      success: true
    });
  }
}

module.exports = ResponseUtil;
