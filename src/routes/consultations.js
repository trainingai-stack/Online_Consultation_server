const express = require('express');
const { body } = require('express-validator');
const consultationController = require('../controllers/consultationController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 创建问诊验证规则
const createConsultationValidation = [
  body('doctorId')
    .notEmpty().withMessage('医生ID不能为空')
    .isInt().withMessage('医生ID必须是整数'),
  body('symptoms')
    .notEmpty().withMessage('症状描述不能为空')
    .isLength({ min: 5 }).withMessage('症状描述至少5个字符')
];

// 所有路由都需要认证
router.use(authMiddleware);

// 问诊相关路由
router.post('/', createConsultationValidation, consultationController.createConsultation);
router.get('/', consultationController.getConsultations);
router.get('/pending', consultationController.getPendingConsultations);
router.get('/:id', consultationController.getConsultationDetail);
router.post('/:id/accept', consultationController.acceptConsultation);
router.post('/:id/complete', consultationController.completeConsultation);
router.post('/:id/cancel', consultationController.cancelConsultation);

module.exports = router;
