const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDirs = {
  avatars: 'uploads/avatars',
  licenses: 'uploads/licenses',
  messages: 'uploads/messages'
};

Object.values(uploadDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 存储配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    if (file.fieldname === 'avatar') {
      uploadPath += 'avatars/';
    } else if (file.fieldname === 'licenseImage') {
      uploadPath += 'licenses/';
    } else if (file.fieldname === 'media') {
      uploadPath += 'messages/';
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    'image': /jpeg|jpg|png|gif|webp/,
    'audio': /mp3|wav|ogg|m4a/
  };

  if (file.fieldname === 'avatar' || file.fieldname === 'licenseImage') {
    if (allowedTypes['image'].test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'), false);
    }
  } else if (file.fieldname === 'media') {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes['image'].test(ext) || allowedTypes['audio'].test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'), false);
    }
  } else {
    cb(null, true);
  }
};

// 上传配置
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// 错误处理中间件
const uploadErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        code: 400,
        message: '文件大小超过限制（最大10MB）',
        data: null,
        success: false
      });
    }
    return res.status(400).json({
      code: 400,
      message: err.message,
      data: null,
      success: false
    });
  }
  next(err);
};

module.exports = {
  upload,
  uploadErrorHandler,
  uploadDirs
};
