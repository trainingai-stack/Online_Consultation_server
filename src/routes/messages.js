const express = require('express');
const { body } = require('express-validator');
const messageController = require('../controllers/messageController');
const { authMiddleware } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// 发送消息验证规则
const sendMessageValidation = [
  body('consultationId')
    .notEmpty().withMessage('问诊ID不能为空')
    .isInt().withMessage('问诊ID必须是整数'),
  body('content')
    .notEmpty().withMessage('消息内容不能为空')
];

// 所有路由都需要认证
router.use(authMiddleware);

// 消息相关路由
router.post('/', upload.single('media'), sendMessageValidation, messageController.sendMessage);
router.get('/recent', messageController.getRecentChats);
router.get('/unread', messageController.getUnreadCount);
router.get('/:consultationId', messageController.getMessages);

module.exports = router;
