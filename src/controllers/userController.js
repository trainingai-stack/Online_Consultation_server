const prisma = require('../config/database');
const ResponseUtil = require('../utils/response');

/**
 * 获取个人中心统计信息
 */
const getUserStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const isDoctor = req.user.role === 'DOCTOR';

    // 基础统计
    const stats = {
      role: req.user.role,
      totalConsultations: 0,
      pendingConsultations: 0,
      inProgressConsultations: 0,
      completedConsultations: 0,
      cancelledConsultations: 0
    };

    // 如果是医生，统计医生的问诊数据
    if (isDoctor) {
      const [
        total,
        pending,
        inProgress,
        completed,
        cancelled
      ] = await Promise.all([
        prisma.consultation.count({
          where: { doctorId: userId }
        }),
        prisma.consultation.count({
          where: { doctorId: userId, status: 'PENDING' }
        }),
        prisma.consultation.count({
          where: { doctorId: userId, status: 'IN_PROGRESS' }
        }),
        prisma.consultation.count({
          where: { doctorId: userId, status: 'COMPLETED' }
        }),
        prisma.consultation.count({
          where: { doctorId: userId, status: 'CANCELLED' }
        })
      ]);

      stats.totalConsultations = total;
      stats.pendingConsultations = pending;
      stats.inProgressConsultations = inProgress;
      stats.completedConsultations = completed;
      stats.cancelledConsultations = cancelled;
    } else {
      // 用户统计
      const [
        total,
        pending,
        inProgress,
        completed,
        cancelled
      ] = await Promise.all([
        prisma.consultation.count({
          where: { patientId: userId }
        }),
        prisma.consultation.count({
          where: { patientId: userId, status: 'PENDING' }
        }),
        prisma.consultation.count({
          where: { patientId: userId, status: 'IN_PROGRESS' }
        }),
        prisma.consultation.count({
          where: { patientId: userId, status: 'COMPLETED' }
        }),
        prisma.consultation.count({
          where: { patientId: userId, status: 'CANCELLED' }
        })
      ]);

      stats.totalConsultations = total;
      stats.pendingConsultations = pending;
      stats.inProgressConsultations = inProgress;
      stats.completedConsultations = completed;
      stats.cancelledConsultations = cancelled;
    }

    // 获取未读消息数
    const consultationIds = await prisma.consultation.findMany({
      where: {
        OR: [
          { patientId: userId },
          { doctorId: userId }
        ],
        status: {
          in: ['PENDING', 'IN_PROGRESS']
        }
      },
      select: {
        id: true
      }
    });

    const unreadCount = await prisma.message.count({
      where: {
        consultationId: {
          in: consultationIds.map(c => c.id)
        },
        senderId: { not: userId },
        isRead: false
      }
    });

    stats.unreadMessages = unreadCount;

    return ResponseUtil.success(res, stats);
  } catch (error) {
    next(error);
  }
};

/**
 * 获取问诊记录（个人中心用）
 */
const getConsultationRecords = async (req, res, next) => {
  try {
    const { status, page = 1, pageSize = 10 } = req.query;
    const userId = req.user.id;
    const isDoctor = req.user.role === 'DOCTOR';

    const where = isDoctor
      ? { doctorId: userId }
      : { patientId: userId };

    if (status) {
      where.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const [consultations, total] = await Promise.all([
      prisma.consultation.findMany({
        where,
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
            },
            include: {
              doctorProfile: {
                select: {
                  hospital: true,
                  department: true,
                  title: true
                }
              }
            }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              content: true,
              createdAt: true
            }
          }
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.consultation.count({ where })
    ]);

    // 格式化数据
    const formattedRecords = consultations.map(c => ({
      id: c.id,
      status: c.status,
      symptoms: c.symptoms,
      diagnosis: c.diagnosis,
      prescription: c.prescription,
      startedAt: c.startedAt,
      endedAt: c.endedAt,
      createdAt: c.createdAt,
      lastMessage: c.messages[0] || null,
      patient: c.patient,
      doctor: {
        ...c.doctor,
        ...c.doctor.doctorProfile
      }
    }));

    return ResponseUtil.paginate(res, formattedRecords, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      total
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取我的医生资质状态
 */
const getDoctorVerifyStatus = async (req, res, next) => {
  try {
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user.id },
      include: {
        category: true
      }
    });

    if (!doctorProfile) {
      return ResponseUtil.success(res, {
        hasProfile: false,
        canApply: true
      });
    }

    return ResponseUtil.success(res, {
      hasProfile: true,
      canApply: false,
      profile: doctorProfile
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取系统通知（模拟）
 */
const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;

    // 这里可以接入真实的通知系统
    // 目前返回模拟数据
    const notifications = [
      {
        id: 1,
        type: 'SYSTEM',
        title: '欢迎使用线上问诊',
        content: '感谢您使用我们的线上问诊服务，如有问题请联系客服。',
        isRead: true,
        createdAt: new Date(Date.now() - 86400000 * 7)
      }
    ];

    return ResponseUtil.paginate(res, notifications, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      total: notifications.length
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserStats,
  getConsultationRecords,
  getDoctorVerifyStatus,
  getNotifications
};
