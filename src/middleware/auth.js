import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'online_consultation_secret_key_2024';

export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'token无效或已过期' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: '认证失败' });
  }
};
