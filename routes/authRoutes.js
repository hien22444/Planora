const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { sendVerificationEmail } = require('../services/emailService');

const router = express.Router();

// Đăng ký
router.get('/register', (req, res) => {
  res.render('auth/register', { 
    layout: 'layouts/main',
    title: 'Đăng ký tài khoản'
  });
});

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, fullName, phone, address, role } = req.body;

    // Kiểm tra user đã tồn tại
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      req.flash('error', 'Email hoặc username đã được sử dụng');
      return res.redirect('/auth/register');
    }

    // Tạo token xác thực email
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 giờ

    // Tạo user mới
    const user = new User({
      username,
      email,
      password,
      fullName,
      phone,
      address,
      role: role || 'customer',
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires
    });

    await user.save();

    // Gửi email xác thực đến email người dùng đăng ký
    try {
      const emailSent = await sendVerificationEmail(email, verificationToken);
      
      if (emailSent) {
        req.flash('success', `Đăng ký thành công! Vui lòng kiểm tra email ${email} để xác thực tài khoản`);
      } else {
        req.flash('warning', 'Đăng ký thành công! Tuy nhiên, không thể gửi email xác thực. Vui lòng liên hệ admin');
      }
    } catch (error) {
      console.error('Email error:', error);
      req.flash('error', 'Có lỗi xảy ra khi gửi email xác thực. Vui lòng thử lại sau');
    }
    
    res.redirect('/login');
  } catch (error) {
    console.error('Register error:', error);
    req.flash('error', 'Có lỗi xảy ra khi đăng ký');
    res.redirect('/auth/register');
  }
});

// Đăng nhập
router.get('/login', (req, res) => {
  if (req.user) {
    if (req.user.role === 'admin') return res.redirect('/admin/dashboard');
    if (req.user.role === 'customer') return res.redirect('/customer/dashboard');
  }
  res.render('auth/login', { 
    layout: 'layouts/main',
    title: 'Đăng nhập'
  });
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Tìm user
    const user = await User.findOne({ email });
    if (!user) {
      req.flash('error', 'Email hoặc mật khẩu không đúng');
      return res.redirect('/login');
    }

    // Kiểm tra password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      req.flash('error', 'Email hoặc mật khẩu không đúng');
      return res.redirect('/login');
    }

    // Kiểm tra tài khoản có bị khóa không
    if (!user.isActive) {
      req.flash('error', 'Tài khoản của bạn đã bị khóa');
      return res.redirect('/login');
    }

    // Kiểm tra email đã được xác thực chưa
    if (!user.isEmailVerified) {
      req.flash('error', 'Vui lòng xác thực email trước khi đăng nhập. Kiểm tra hộp thư của bạn');
      return res.redirect('/login');
    }

    // Lưu session
    req.session.userId = user._id;
    req.session.userRole = user.role;

    req.flash('success', 'Đăng nhập thành công!');
    
    // Redirect theo role
    if (user.role === 'admin') {
      res.redirect('/admin/dashboard');
    } else if (user.role === 'shop') {
      res.redirect('/shop/dashboard');
    } else {
      res.redirect('/customer/dashboard');
    }
  } catch (error) {
    console.error('Login error:', error);
    req.flash('error', 'Có lỗi xảy ra khi đăng nhập');
    res.redirect('/login');
  }
});

// Xác thực email
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      req.flash('error', 'Token xác thực không hợp lệ');
      return res.redirect('/login');
    }

    // Tìm user với token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      req.flash('error', 'Token xác thực không hợp lệ hoặc đã hết hạn');
      return res.redirect('/login');
    }

    // Cập nhật trạng thái xác thực
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    req.flash('success', 'Email đã được xác thực thành công! Bạn có thể đăng nhập ngay bây giờ');
    res.redirect('/login');
  } catch (error) {
    console.error('Email verification error:', error);
    req.flash('error', 'Có lỗi xảy ra khi xác thực email');
    res.redirect('/login');
  }
});

// Gửi lại email xác thực
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      req.flash('error', 'Email không tồn tại');
      return res.redirect('/login');
    }

    if (user.isEmailVerified) {
      req.flash('info', 'Email đã được xác thực rồi');
      return res.redirect('/login');
    }

    // Tạo token mới
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    // Gửi email xác thực
    const emailSent = await sendVerificationEmail(email, verificationToken);
    
    if (emailSent) {
      req.flash('success', 'Email xác thực đã được gửi lại! Vui lòng kiểm tra hộp thư');
    } else {
      req.flash('error', 'Không thể gửi email xác thực. Vui lòng thử lại sau');
    }
    
    res.redirect('/login');
  } catch (error) {
    console.error('Resend verification error:', error);
    req.flash('error', 'Có lỗi xảy ra khi gửi lại email xác thực');
    res.redirect('/login');
  }
});

// Đăng xuất
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
});

module.exports = router;
