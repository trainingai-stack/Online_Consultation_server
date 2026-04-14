const { validationResult } = require('express-validator');
const prisma = require('../config/database');
const ResponseUtil = require('../utils/response');

/**
 * 发起问诊
 */
const createConsultation = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseUtil.badRequest(res, errors.array()[0].msg);
    }

    const { doctorId, symptoms } = req.body;

    // 检查医生是否存在且已认证
    const doctor = await prisma.user.findFirst({
      where: {
        id: parseInt(doctorId),
        role: 'DOCTOR',
        status: 'ACTIVE',
        doctorProfile: {
          verifyStatus: 'APPROVED'
        }
      },
      include: {
        doctorProfile: true
      }
    });

    if (!doctor) {
      return ResponseUtil.notFound(res, '医生不存在或未通过认证');
    }

    // 不能向自己发起问诊
    if (parseInt(doctorId) === req.user.id) {
      return ResponseUtil.badRequest(res, '不能向自己发起问诊');
    }

    // 检查是否有进行中的问诊
    const existingConsultation = await prisma.consultation.findFirst({
      where: {
        patientId: req.user.id,
        doctorId: parseInt(doctorId),
        status: {
          in: ['PENDING', 'IN_PROGRESS']
        }
      }
    });

    if (existingConsultation) {
      return ResponseUtil.error(res, '您已有进行中的问诊，请先完成或取消', 400);
    }

    const consultation = await prisma.consultation.create({
      data: {
        patientId: req.user.id,
        doctorId: parseInt(doctorId),
        symptoms,
        status: 'PENDING'
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
        }
      }
    });

    return ResponseUtil.success(res, consultation, '问诊发起成功，等待医生接诊');
  } catch (error) {
    next(error);
  }
};

/**
 * 获取问诊列表
 */
const getConsultations = async (req, res, next) => {
  try {
    const { status, role, page = 1, pageSize = 10 } = req.query;

    const where = {};

    // 根据角色筛选
    if (role === 'doctor') {
      where.doctorId = req.user.id;
    } else {
      where.patientId = req.user.id;
    }

    // 状态筛选
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
          _count: {
            select: {
              messages: true
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
    const formattedConsultations = consultations.map(c => ({
      id: c.id,
      status: c.status,
      symptoms: c.symptoms,
      diagnosis: c.diagnosis,
      prescription: c.prescription,
      startedAt: c.startedAt,
      endedAt: c.endedAt,
      createdAt: c.createdAt,
      messageCount: c._count.messages,
      patient: c.patient,
      doctor: {
        ...c.doctor,
        ...c.doctor.doctorProfile
      }
    }));

    return ResponseUtil.paginate(res, formattedConsultations, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      total
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取问诊详情
 */
const getConsultationDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const consultation = await prisma.consultation.findUnique({
      where: { id: parseInt(id) },
      include: {
        patient: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            phone: true
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
                title: true,
                specialty: true
              }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                nickname: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    if (!consultation) {
      return ResponseUtil.notFound(res, '问诊记录不存在');
    }

    // 验证权限
    if (consultation.patientId !== req.user.id && consultation.doctorId !== req.user.id) {
      return ResponseUtil.forbidden(res);
    }

    const result = {
      ...consultation,
      doctor: {
        ...consultation.doctor,
        ...consultation.doctor.doctorProfile
      }
    };

    return ResponseUtil.success(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * 医生接诊
 */
const acceptConsultation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const consultation = await prisma.consultation.findUnique({
      where: { id: parseInt(id) }
    });

    if (!consultation) {
      return ResponseUtil.notFound(res, '问诊记录不存在');
    }

    // 验证是否为该问诊的医生
    if (consultation.doctorId !== req.user.id) {
      return ResponseUtil.forbidden(res);
    }

    // 验证状态
    if (consultation.status !== 'PENDING') {
      return ResponseUtil.error(res, '该问诊状态不允许接诊', 400);
    }

    const updatedConsultation = await prisma.consultation.update({
      where: { id: parseInt(id) },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date()
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
        }
      }
    });

    return ResponseUtil.success(res, updatedConsultation, '接诊成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 完成问诊
 */
const completeConsultation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { diagnosis, prescription } = req.body;

    const consultation = await prisma.consultation.findUnique({
      where: { id: parseInt(id) }
    });

    if (!consultation) {
      return ResponseUtil.notFound(res, '问诊记录不存在');
    }

    // 验证权限（医生和患者都可以完成）
    if (consultation.patientId !== req.user.id && consultation.doctorId !== req.user.id) {
      return ResponseUtil.forbidden(res);
    }

    // 验证状态
    if (consultation.status !== 'IN_PROGRESS') {
      return ResponseUtil.error(res, '该问诊状态不允许完成', 400);
    }

    const updateData = {
      status: 'COMPLETED',
      endedAt: new Date()
    };

    // 只有医生可以填写诊断和处方
    if (consultation.doctorId === req.user.id) {
      if (diagnosis) updateData.diagnosis = diagnosis;
      if (prescription) updateData.prescription = prescription;
    }

    const updatedConsultation = await prisma.consultation.update({
      where: { id: parseInt(id) },
      data: updateData,
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
        }
      }
    });

    return ResponseUtil.success(res, updatedConsultation, '问诊已完成');
  } catch (error) {
    next(error);
  }
};

/**
 * 取消问诊
 */
const cancelConsultation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const consultation = await prisma.consultation.findUnique({
      where: { id: parseInt(id) }
    });

    if (!consultation) {
      return ResponseUtil.notFound(res, '问诊记录不存在');
    }

    // 验证权限
    if (consultation.patientId !== req.user.id && consultation.doctorId !== req.user.id) {
      return ResponseUtil.forbidden(res);
    }

    // 验证状态
    if (!['PENDING', 'IN_PROGRESS'].includes(consultation.status)) {
      return ResponseUtil.error(res, '该问诊状态不允许取消', 400);
    }

    const updatedConsultation = await prisma.consultation.update({
      where: { id: parseInt(id) },
      data: {
        status: 'CANCELLED',
        endedAt: new Date()
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
        }
      }
    });

    return ResponseUtil.success(res, updatedConsultation, '问诊已取消');
  } catch (error) {
    next(error);
  }
};

/**
 * 获取待接诊列表（医生用）
 */
const getPendingConsultations = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;

    const where = {
      doctorId: req.user.id,
      status: 'PENDING'
    };

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
          }
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.consultation.count({ where })
    ]);

    return ResponseUtil.paginate(res, consultations, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      total
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createConsultation,
  getConsultations,
  getConsultationDetail,
  acceptConsultation,
  completeConsultation,
  cancelConsultation,
  getPendingConsultations
};
