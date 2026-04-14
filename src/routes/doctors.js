const express = require('express');
const { body } = require('express-validator');
const doctorController = require('../controllers/doctorController');
const { authMiddleware } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// 提交医生资质验证规则
const doctorProfileValidation = [
  body('realName')
    .notEmpty().withMessage('真实姓名不能为空'),
  body('idCard')
    .notEmpty().withMessage('身份证号不能为空')
    .matches(/^\d{17}[\dXx]$/).withMessage('身份证号格式不正确'),
  body('licenseNo')
    .notEmpty().withMessage('执业证号不能为空'),
  body('hospital')
    .notEmpty().withMessage('所属医院不能为空'),
  body('department')
    .notEmpty().withMessage('科室不能为空'),
  body('title')
    .notEmpty().withMessage('职称不能为空')
];

// 公开路由
router.get('/home', doctorController.getHomeData);
router.get('/categories', doctorController.getCategories);
router.get('/', doctorController.getDoctors);
router.get('/:id', doctorController.getDoctorDetail);

// 需要认证的路由
router.post(
  '/apply',
  authMiddleware,
  upload.single('licenseImage'),
  doctorProfileValidation,
  doctorController.submitDoctorProfile
);
router.get('/my/profile', authMiddleware, doctorController.getMyDoctorProfile);
router.put(
  '/my/profile',
  authMiddleware,
  upload.single('licenseImage'),
  doctorController.updateDoctorProfile
);

module.exports = router;
