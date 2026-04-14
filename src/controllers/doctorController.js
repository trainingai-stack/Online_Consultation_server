const { validationResult } = require('express-validator');
const prisma = require('../config/database');
const ResponseUtil = require('../utils/response');

/**
 * 获取医生分类列表
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await prisma.doctorCategory.findMany({
      orderBy: { sortOrder: 'asc' }
    });

    return ResponseUtil.success(res, categories);
  } catch (error) {
    next(error);
  }
};

/**
 * 获取医生列表
 */
const getDoctors = async (req, res, next) => {
  try {
    const { 
      categoryId, 
      keyword,
      page = 1, 
      pageSize = 10 
    } = req.query;

    const where = {
      user: {
        role: 'DOCTOR',
        status: 'ACTIVE'
      },
      verifyStatus: 'APPROVED'
    };

    if (categoryId) {
      where.categoryId = parseInt(categoryId);
    }

    if (keyword) {
      where.OR = [
        { realName: { contains: keyword } },
        { hospital: { contains: keyword } },
        { department: { contains: keyword } },
        { specialty: { contains: keyword } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const [doctors, total] = await Promise.all([
      prisma.doctorProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatar: true
            }
          },
          category: true
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.doctorProfile.count({ where })
    ]);

    // 格式化数据
    const formattedDoctors = doctors.map(doctor => ({
      id: doctor.user.id,
      doctorProfileId: doctor.id,
      nickname: doctor.user.nickname,
      avatar: doctor.user.avatar,
      realName: doctor.realName,
      hospital: doctor.hospital,
      department: doctor.department,
      title: doctor.title,
      specialty: doctor.specialty,
      introduction: doctor.introduction,
      category: doctor.category
    }));

    return ResponseUtil.paginate(res, formattedDoctors, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      total
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取医生详情
 */
const getDoctorDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const doctor = await prisma.doctorProfile.findFirst({
      where: {
        userId: parseInt(id),
        verifyStatus: 'APPROVED',
        user: {
          role: 'DOCTOR',
          status: 'ACTIVE'
        }
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            createdAt: true
          }
        },
        category: true
      }
    });

    if (!doctor) {
      return ResponseUtil.notFound(res, '医生不存在');
    }

    // 获取问诊统计
    const stats = await prisma.consultation.groupBy({
      by: ['status'],
      where: {
        doctorId: parseInt(id),
        status: { in: ['COMPLETED'] }
      },
      _count: true
    });

    const completedCount = stats.find(s => s.status === 'COMPLETED')?._count || 0;

    const result = {
      id: doctor.user.id,
      nickname: doctor.user.nickname,
      avatar: doctor.user.avatar,
      realName: doctor.realName,
      hospital: doctor.hospital,
      department: doctor.department,
      title: doctor.title,
      specialty: doctor.specialty,
      introduction: doctor.introduction,
      category: doctor.category,
      completedConsultations: completedCount,
      joinedAt: doctor.user.createdAt
    };

    return ResponseUtil.success(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * 提交医生资质认证
 */
const submitDoctorProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseUtil.badRequest(res, errors.array()[0].msg);
    }

    const {
      realName,
      idCard,
      licenseNo,
      hospital,
      department,
      title,
      specialty,
      introduction,
      categoryId
    } = req.body;

    // 检查是否已提交过
    const existingProfile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (existingProfile) {
      return ResponseUtil.error(res, '您已提交过资质认证', 400);
    }

    // 检查执业证号是否已被使用
    const licenseExists = await prisma.doctorProfile.findUnique({
      where: { licenseNo }
    });

    if (licenseExists) {
      return ResponseUtil.error(res, '该执业证号已被注册', 409);
    }

    // 处理资质图片
    let licenseImage = null;
    if (req.file) {
      licenseImage = `/uploads/licenses/${req.file.filename}`;
    } else {
      return ResponseUtil.badRequest(res, '请上传执业资质证明');
    }

    const doctorProfile = await prisma.doctorProfile.create({
      data: {
        userId: req.user.id,
        realName,
        idCard,
        licenseNo,
        licenseImage,
        hospital,
        department,
        title,
        specialty,
        introduction,
        categoryId: categoryId ? parseInt(categoryId) : null,
        verifyStatus: 'PENDING'
      },
      include: {
        category: true
      }
    });

    return ResponseUtil.success(res, doctorProfile, '资质认证提交成功，请等待审核');
  } catch (error) {
    next(error);
  }
};

/**
 * 获取我的医生资质
 */
const getMyDoctorProfile = async (req, res, next) => {
  try {
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user.id },
      include: {
        category: true
      }
    });

    if (!doctorProfile) {
      return ResponseUtil.success(res, null);
    }

    return ResponseUtil.success(res, doctorProfile);
  } catch (error) {
    next(error);
  }
};

/**
 * 更新医生资质
 */
const updateDoctorProfile = async (req, res, next) => {
  try {
    const {
      hospital,
      department,
      title,
      specialty,
      introduction,
      categoryId
    } = req.body;

    const existingProfile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!existingProfile) {
      return ResponseUtil.notFound(res, '医生资质不存在');
    }

    const updateData = {};
    if (hospital !== undefined) updateData.hospital = hospital;
    if (department !== undefined) updateData.department = department;
    if (title !== undefined) updateData.title = title;
    if (specialty !== undefined) updateData.specialty = specialty;
    if (introduction !== undefined) updateData.introduction = introduction;
    if (categoryId !== undefined) updateData.categoryId = parseInt(categoryId);

    // 如果更新了图片
    if (req.file) {
      updateData.licenseImage = `/uploads/licenses/${req.file.filename}`;
      // 重置审核状态
      updateData.verifyStatus = 'PENDING';
    }

    const doctorProfile = await prisma.doctorProfile.update({
      where: { userId: req.user.id },
      data: updateData,
      include: {
        category: true
      }
    });

    return ResponseUtil.success(res, doctorProfile, '更新成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 获取首页数据（分类+推荐医生）
 */
const getHomeData = async (req, res, next) => {
  try {
    // 获取分类
    const categories = await prisma.doctorCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      take: 8
    });

    // 获取推荐医生
    const doctors = await prisma.doctorProfile.findMany({
      where: {
        user: {
          role: 'DOCTOR',
          status: 'ACTIVE'
        },
        verifyStatus: 'APPROVED'
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true
          }
        },
        category: true
      },
      take: 6,
      orderBy: { createdAt: 'desc' }
    });

    const formattedDoctors = doctors.map(doctor => ({
      id: doctor.user.id,
      nickname: doctor.user.nickname,
      avatar: doctor.user.avatar,
      realName: doctor.realName,
      hospital: doctor.hospital,
      department: doctor.department,
      title: doctor.title,
      specialty: doctor.specialty,
      category: doctor.category
    }));

    return ResponseUtil.success(res, {
      categories,
      doctors: formattedDoctors
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getDoctors,
  getDoctorDetail,
  submitDoctorProfile,
  getMyDoctorProfile,
  updateDoctorProfile,
  getHomeData
};
