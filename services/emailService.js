const nodemailer = require('nodemailer');

// Cấu hình email (sử dụng Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// Gửi email xác thực
const sendVerificationEmail = async (email, verificationToken) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: email,
      subject: 'Xác thực tài khoản Planora',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Planora</h1>
            <p style="margin: 10px 0 0 0;">Nền tảng thuê dịch vụ sự kiện</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Xác thực tài khoản</h2>
            <p style="color: #666; line-height: 1.6;">
              Cảm ơn bạn đã đăng ký tài khoản tại Planora! 
              Để hoàn tất quá trình đăng ký, vui lòng click vào nút bên dưới để xác thực email <strong>${email}</strong> của bạn.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.BASE_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        display: inline-block;
                        font-weight: bold;">
                Xác thực tài khoản
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Nếu nút không hoạt động, bạn có thể copy link sau vào trình duyệt:<br>
              <a href="${process.env.BASE_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}" 
                 style="color: #667eea; word-break: break-all;">
                ${process.env.BASE_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}
              </a>
            </p>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              Link này sẽ hết hạn sau 24 giờ. Nếu bạn không yêu cầu tạo tài khoản này, 
              vui lòng bỏ qua email này.
            </p>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
            <p style="margin: 0;">© 2024 Planora. Tất cả quyền được bảo lưu.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    return false;
  }
};

// Gửi email thông báo đơn hàng
const sendOrderNotification = async (email, orderDetails) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: email,
      subject: `Đơn hàng #${orderDetails.orderId} - ${orderDetails.status}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Planora</h1>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333;">Cập nhật đơn hàng</h2>
            <p>Đơn hàng #${orderDetails.orderId} của bạn đã được cập nhật:</p>
            <p><strong>Trạng thái:</strong> ${orderDetails.status}</p>
            <p><strong>Tổng tiền:</strong> ${orderDetails.totalAmount.toLocaleString()} VNĐ</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Order notification sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Error sending order notification:', error);
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
  sendOrderNotification
};
