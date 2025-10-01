const User = require('../models/User');

// Middleware kiểm tra đăng nhập
const requireAuth = async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId);
      if (user) {
        req.user = user;
        return next();
      } else {
        req.flash('error', 'Tài khoản không tồn tại');
        return res.redirect('/login');
      }
    } catch (error) {
      console.error('Auth middleware error:', error);
      req.flash('error', 'Lỗi xác thực');
      return res.redirect('/login');
    }
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
      if (user && user.role === 'customer') {
        return res.redirect('/customer/dashboard');
      } else if (user && user.role === 'shop') {
        return res.redirect('/shop/dashboard');
      }
      return res.redirect('/login');
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
      console.log('LoadUser - User:', user ? user.fullName : 'Not found');
      console.log('LoadUser - Role:', user ? user.role : 'No role');
    } catch (error) {
      console.error('Load user error:', error);
    }
  } else {
    console.log('LoadUser - No session userId');
  }
  return next();
};

module.exports = {
  requireAuth,
  requireAdmin,
  requireShop,
  loadUser
};
