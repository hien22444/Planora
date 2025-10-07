const express = require("express");
const crypto = require("crypto");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../services/emailService");

const router = express.Router();

// Đăng ký
router.get("/register", (req, res) => {
  res.render("auth/register", {
    layout: "layouts/main",
    title: "Đăng ký tài khoản",
  });
});

router.post("/register", async (req, res) => {
  try {
    const { username, email, password, fullName, phone, address } = req.body;

    // Kiểm tra user đã tồn tại
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      req.flash("error", "Email hoặc username đã được sử dụng");
      return res.redirect("/auth/register");
    }

    // Tạo token xác thực email
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 giờ

    // Tạo user mới
    // Force role to 'customer' for all registrations. Shop accounts must be requested and approved by admin.
    const user = new User({
      username,
      email,
      password,
      fullName,
      phone,
      address,
      role: "customer",
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    await user.save();

    // Gửi email xác thực đến email người dùng đăng ký
    try {
      const emailSent = await sendVerificationEmail(email, verificationToken);

      if (emailSent) {
        req.flash(
          "success",
          `Đăng ký thành công! Vui lòng kiểm tra email ${email} để xác thực tài khoản`
        );
      } else {
        req.flash(
          "warning",
          "Đăng ký thành công! Tuy nhiên, không thể gửi email xác thực. Vui lòng liên hệ admin"
        );
      }
    } catch (error) {
      console.error("Email error:", error);
      req.flash(
        "error",
        "Có lỗi xảy ra khi gửi email xác thực. Vui lòng thử lại sau"
      );
    }

    res.redirect("/auth/login");
  } catch (error) {
    console.error("Register error:", error);
    req.flash("error", "Có lỗi xảy ra khi đăng ký");
    res.redirect("/auth/register");
  }
});

// Đăng nhập
router.get("/login", (req, res) => {
  if (req.user) {
    if (req.user.role === "admin") return res.redirect("/admin/dashboard");
    if (req.user.role === "customer" || req.user.role === "shop")
      return res.redirect("/customer/dashboard");
  }
  res.render("auth/login", {
    layout: "layouts/main",
    title: "Đăng nhập",
  });
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Tìm user
    const user = await User.findOne({ email });
    if (!user) {
      req.flash("error", "Email hoặc mật khẩu không đúng");
      return res.redirect("/auth/login");
    }

    // Kiểm tra password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      req.flash("error", "Email hoặc mật khẩu không đúng");
      return res.redirect("/auth/login");
    }

    // Kiểm tra tài khoản có bị khóa không
    if (!user.isActive) {
      req.flash("error", "Tài khoản của bạn đã bị khóa");
      return res.redirect("/auth/login");
    }

    // Kiểm tra email đã được xác thực chưa
    if (!user.isEmailVerified) {
      req.flash(
        "error",
        "Vui lòng xác thực email trước khi đăng nhập. Kiểm tra hộp thư của bạn"
      );
      return res.redirect("/auth/login");
    }

    // Lưu session
    req.session.userId = user._id;
    req.session.userRole = user.role;

    req.flash("success", "Đăng nhập thành công!");

    // Redirect theo role (shops act like customers for dashboard access)
    if (user.role === "admin") {
      res.redirect("/admin/dashboard");
    } else if (user.role === "shop" || user.role === "customer") {
      res.redirect("/customer/dashboard");
    } else {
      res.redirect("/customer/dashboard");
    }
  } catch (error) {
    console.error("Login error:", error);
    req.flash("error", "Có lỗi xảy ra khi đăng nhập");
    res.redirect("/auth/login");
  }
});

// Xác thực email
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      req.flash("error", "Token xác thực không hợp lệ");
      return res.redirect("/auth/login");
    }

    // Tìm user với token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      req.flash("error", "Token xác thực không hợp lệ hoặc đã hết hạn");
      return res.redirect("/auth/login");
    }

    // Cập nhật trạng thái xác thực
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    req.flash(
      "success",
      "Email đã được xác thực thành công! Bạn có thể đăng nhập ngay bây giờ"
    );
    res.redirect("/auth/login");
  } catch (error) {
    console.error("Email verification error:", error);
    req.flash("error", "Có lỗi xảy ra khi xác thực email");
    res.redirect("/auth/login");
  }
});

// Gửi lại email xác thực
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      req.flash("error", "Email không tồn tại");
      return res.redirect("/auth/login");
    }

    if (user.isEmailVerified) {
      req.flash("info", "Email đã được xác thực rồi");
      return res.redirect("/auth/login");
    }

    // Tạo token mới
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    // Gửi email xác thực
    const emailSent = await sendVerificationEmail(email, verificationToken);

    if (emailSent) {
      req.flash(
        "success",
        "Email xác thực đã được gửi lại! Vui lòng kiểm tra hộp thư"
      );
    } else {
      req.flash("error", "Không thể gửi email xác thực. Vui lòng thử lại sau");
    }

    res.redirect("/auth/login");
  } catch (error) {
    console.error("Resend verification error:", error);
    req.flash("error", "Có lỗi xảy ra khi gửi lại email xác thực");
    res.redirect("/auth/login");
  }
});

// Đăng xuất (GET) - phù hợp với link trong layout
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
    }
    res.redirect("/");
  });
});

// Đăng xuất (POST)
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
    }
    res.redirect("/auth/login");
  });
});

// Quên mật khẩu - hiển thị form
router.get("/forgot-password", (req, res) => {
  res.render("auth/forgot-password", {
    layout: "layouts/main",
    title: "Quên mật khẩu",
  });
});

// Quên mật khẩu - xử lý
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      req.flash("error", "Không tìm thấy tài khoản với email này");
      return res.redirect("/auth/forgot-password");
    }

    // Tạo token reset password
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 giờ

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;
    await user.save();

    // Gửi email reset password
    try {
      const emailSent = await sendPasswordResetEmail(email, resetToken);

      if (emailSent) {
        req.flash(
          "success",
          `Email đặt lại mật khẩu đã được gửi đến ${email}. Vui lòng kiểm tra hộp thư của bạn.`
        );
      } else {
        req.flash(
          "error",
          "Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau."
        );
      }
    } catch (error) {
      console.error("Password reset email error:", error);
      req.flash("error", "Có lỗi xảy ra khi gửi email. Vui lòng thử lại sau.");
    }

    res.redirect("/auth/forgot-password");
  } catch (error) {
    console.error("Forgot password error:", error);
    req.flash("error", "Có lỗi xảy ra. Vui lòng thử lại sau.");
    res.redirect("/auth/forgot-password");
  }
});

// Reset mật khẩu - hiển thị form
router.get("/reset-password", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      req.flash("error", "Token đặt lại mật khẩu không hợp lệ");
      return res.redirect("/auth/forgot-password");
    }

    // Kiểm tra token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      req.flash("error", "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn");
      return res.redirect("/auth/forgot-password");
    }

    res.render("auth/reset-password", {
      layout: "layouts/main",
      title: "Đặt lại mật khẩu",
      token: token,
    });
  } catch (error) {
    console.error("Reset password page error:", error);
    req.flash("error", "Có lỗi xảy ra. Vui lòng thử lại sau.");
    res.redirect("/auth/forgot-password");
  }
});

// Reset mật khẩu - xử lý
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      req.flash("error", "Vui lòng điền đầy đủ thông tin");
      return res.redirect(`/auth/reset-password?token=${token}`);
    }

    if (password !== confirmPassword) {
      req.flash("error", "Mật khẩu xác nhận không khớp");
      return res.redirect(`/auth/reset-password?token=${token}`);
    }

    if (password.length < 6) {
      req.flash("error", "Mật khẩu phải có ít nhất 6 ký tự");
      return res.redirect(`/auth/reset-password?token=${token}`);
    }

    // Tìm user với token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      req.flash("error", "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn");
      return res.redirect("/auth/forgot-password");
    }

    // Cập nhật mật khẩu
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    req.flash(
      "success",
      "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ."
    );
    res.redirect("/auth/login");
  } catch (error) {
    console.error("Reset password error:", error);
    req.flash(
      "error",
      "Có lỗi xảy ra khi đặt lại mật khẩu. Vui lòng thử lại sau."
    );
    res.redirect("/auth/forgot-password");
  }
});

module.exports = router;
