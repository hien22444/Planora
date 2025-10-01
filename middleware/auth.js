const User = require('../models/User');

// Middleware kiểm tra đăng nhập
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  } else {
    req.flash('error', 'Vui lòng đăng nhập để tiếp tục');
    return res.redirect('/login');
  }
};

// Middleware kiểm tra quyền admin
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      req.flash('error', 'Vui lòng đăng nhập để tiếp tục');
      return res.redirect('/login');
    }

    const user = await User.findById(req.session.userId);
    if (!user || user.role !== 'admin') {
      req.flash('error', 'Bạn không có quyền truy cập trang này');
      return res.redirect('/');
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    req.flash('error', 'Lỗi xác thực');
    res.redirect('/login');
  }
};

// Middleware kiểm tra quyền shop
const requireShop = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      req.flash('error', 'Vui lòng đăng nhập để tiếp tục');
      return res.redirect('/login');
    }

    const user = await User.findById(req.session.userId);
    if (!user || (user.role !== 'shop' && user.role !== 'admin')) {
      req.flash('error', 'Bạn không có quyền truy cập trang này');
      return res.redirect('/');
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    req.flash('error', 'Lỗi xác thực');
    res.redirect('/login');
  }
};

// Middleware lưu thông tin user vào req
const loadUser = async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId);
      req.user = user;
    } catch (error) {
      console.error('Load user error:', error);
    }
  }
  return next();
};

module.exports = {
  requireAuth,
  requireAdmin,
  requireShop,
  loadUser
};
