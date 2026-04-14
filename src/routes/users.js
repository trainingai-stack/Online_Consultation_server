const express = require('express');
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证
router.use(authMiddleware);

// 用户中心路由
router.get('/stats', userController.getUserStats);
router.get('/records', userController.getConsultationRecords);
router.get('/doctor-status', userController.getDoctorVerifyStatus);
router.get('/notifications', userController.getNotifications);

module.exports = router;
