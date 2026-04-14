const prisma = require('../config/database');
const ResponseUtil = require('../utils/response');

/**
 * 发送消息
 */
const sendMessage = async (req, res, next) => {
  try {
    const { consultationId, content, type = 'TEXT' } = req.body;

    // 验证问诊是否存在
    const consultation = await prisma.consultation.findUnique({
      where: { id: parseInt(consultationId) }
    });

    if (!consultation) {
      return ResponseUtil.notFound(res, '问诊记录不存在');
    }

    // 验证权限
    if (consultation.patientId !== req.user.id && consultation.doctorId !== req.user.id) {
      return ResponseUtil.forbidden(res);
    }

    // 验证问诊状态
    if (consultation.status === 'CANCELLED') {
      return ResponseUtil.error(res, '问诊已取消，无法发送消息', 400);
    }

    if (consultation.status === 'COMPLETED') {
      return ResponseUtil.error(res, '问诊已结束，无法发送消息', 400);
    }

    // 处理媒体文件
    let mediaUrl = null;
    if (req.file) {
      mediaUrl = `/uploads/messages/${req.file.filename}`;
    }

    // 如果是图片或语音消息，必须有媒体文件
    if ((type === 'IMAGE' || type === 'VOICE') && !mediaUrl) {
      return ResponseUtil.badRequest(res, '请上传媒体文件');
    }

    const message = await prisma.message.create({
      data: {
        consultationId: parseInt(consultationId),
        senderId: req.user.id,
        type,
        content,
        mediaUrl
      },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
            avatar: true
          }
        }
      }
    });

    // 更新问诊时间
    await prisma.consultation.update({
      where: { id: parseInt(consultationId) },
      data: { updatedAt: new Date() }
    });

    return ResponseUtil.success(res, message, '发送成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 获取消息列表
 */
const getMessages = async (req, res, next) => {
  try {
    const { consultationId } = req.params;
    const { beforeId, pageSize = 20 } = req.query;

    // 验证问诊是否存在
    const consultation = await prisma.consultation.findUnique({
      where: { id: parseInt(consultationId) }
    });

    if (!consultation) {
      return ResponseUtil.notFound(res, '问诊记录不存在');
    }

    // 验证权限
    if (consultation.patientId !== req.user.id && consultation.doctorId !== req.user.id) {
      return ResponseUtil.forbidden(res);
    }

    const where = {
      consultationId: parseInt(consultationId)
    };

    // 分页查询（使用游标）
    if (beforeId) {
      where.id = { lt: parseInt(beforeId) };
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
            avatar: true
          }
        }
      },
      take: parseInt(pageSize),
      orderBy: { createdAt: 'desc' }
    });

    // 标记消息为已读
    await prisma.message.updateMany({
      where: {
        consultationId: parseInt(consultationId),
        senderId: { not: req.user.id },
        isRead: false
      },
      data: { isRead: true }
    });

    // 反转顺序，按时间正序返回
    return ResponseUtil.success(res, messages.reverse());
  } catch (error) {
    next(error);
  }
};

/**
 * 获取未读消息数
 */
const getUnreadCount = async (req, res, next) => {
  try {
    // 获取用户参与的所有问诊
    const consultations = await prisma.consultation.findMany({
      where: {
        OR: [
          { patientId: req.user.id },
          { doctorId: req.user.id }
        ],
        status: {
          in: ['PENDING', 'IN_PROGRESS']
        }
      },
      select: {
        id: true
      }
    });

    const consultationIds = consultations.map(c => c.id);

    // 统计未读消息
    const unreadCount = await prisma.message.count({
      where: {
        consultationId: { in: consultationIds },
        senderId: { not: req.user.id },
        isRead: false
      }
    });

    // 按问诊分组统计
    const unreadByConsultation = await prisma.message.groupBy({
      by: ['consultationId'],
      where: {
        consultationId: { in: consultationIds },
        senderId: { not: req.user.id },
        isRead: false
      },
      _count: true
    });

    return ResponseUtil.success(res, {
      total: unreadCount,
      byConsultation: unreadByConsultation.map(item => ({
        consultationId: item.consultationId,
        count: item._count
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取最近联系人列表（带最后一条消息）
 */
const getRecentChats = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;

    // 获取用户的问诊列表
    const consultations = await prisma.consultation.findMany({
      where: {
        OR: [
          { patientId: req.user.id },
          { doctorId: req.user.id }
        ]
      },
      include: {
        patient: {
          select: {
            id: true,
            nickname: true,
            avatar: true
          }
        },
        doctor: {
          select: {
            id: true,
            nickname: true,
            avatar: true
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                nickname: true
              }
            }
          }
        }
      },
      skip: (parseInt(page) - 1) * parseInt(pageSize),
      take: parseInt(pageSize),
      orderBy: { updatedAt: 'desc' }
    });

    // 格式化数据
    const formattedChats = consultations.map(c => {
      const isPatient = c.patientId === req.user.id;
      const otherUser = isPatient ? c.doctor : c.patient;
      const lastMessage = c.messages[0];

      return {
        consultationId: c.id,
        status: c.status,
        otherUser,
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          type: lastMessage.type,
          content: lastMessage.content,
          sender: lastMessage.sender,
          isRead: lastMessage.isRead,
          createdAt: lastMessage.createdAt
        } : null,
        updatedAt: c.updatedAt
      };
    });

    return ResponseUtil.success(res, formattedChats);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendMessage,
  getMessages,
  getUnreadCount,
  getRecentChats
};
