const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// 注册验证规则
const registerValidation = [
  body('phone')
    .notEmpty().withMessage('手机号不能为空')
    .matches(/^1[3-9]\d{9}$/).withMessage('手机号格式不正确'),
  body('password')
    .notEmpty().withMessage('密码不能为空')
    .isLength({ min: 6 }).withMessage('密码长度至少6位')
];

// 登录验证规则
const loginValidation = [
  body('phone')
    .notEmpty().withMessage('手机号不能为空'),
  body('password')
    .notEmpty().withMessage('密码不能为空')
];

// 修改密码验证规则
const changePasswordValidation = [
  body('oldPassword')
    .notEmpty().withMessage('原密码不能为空'),
  body('newPassword')
    .notEmpty().withMessage('新密码不能为空')
    .isLength({ min: 6 }).withMessage('新密码长度至少6位')
];

// 公开路由
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);

// 需要认证的路由
router.get('/me', authMiddleware, authController.getCurrentUser);
router.put('/profile', authMiddleware, upload.single('avatar'), authController.updateProfile);
router.post('/change-password', authMiddleware, changePasswordValidation, authController.changePassword);
router.post('/select-role', authMiddleware, authController.selectRole);

module.exports = router;
