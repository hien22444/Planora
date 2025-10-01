# Planora - Hệ thống thuê dịch vụ sự kiện

## Mô tả
Planora là nền tảng thuê dịch vụ sự kiện trực tuyến, kết nối khách hàng với các nhà cung cấp dịch vụ sự kiện chuyên nghiệp.

## Tính năng chính

### Cho Khách hàng:
- ✅ Đăng ký/Đăng nhập tài khoản
- ✅ Xem danh sách dịch vụ (âm thanh, ánh sáng, địa điểm, bàn ghế, MC, v.v.)
- ✅ Tìm kiếm/Lọc dịch vụ theo loại, giá, địa điểm
- ✅ Xem chi tiết dịch vụ (giá, mô tả, ảnh, đánh giá)
- ✅ Thêm dịch vụ vào giỏ hàng
- ✅ Đặt thuê dịch vụ (checkout)
- ✅ Xem lịch sử thuê
- ✅ Hủy đơn thuê (nếu đơn chưa được shop xác nhận)
- ✅ Đánh giá/Bình luận dịch vụ sau khi hoàn thành

### Cho Admin:
- ✅ Quản lý người dùng (khách hàng, shop – khóa/mở tài khoản)
- ✅ Duyệt yêu cầu đăng ký shop (approve/reject)
- ✅ Quản lý danh mục dịch vụ
- ✅ Quản lý đơn thuê (có thể can thiệp khi có tranh chấp)
- ✅ Quản lý thanh toán/hoàn tiền
- ✅ Xem báo cáo thống kê (doanh thu tổng, số lượng đơn, dịch vụ hot)
- ✅ Quản lý đánh giá (ẩn/bỏ ẩn đánh giá vi phạm)

## Công nghệ sử dụng
- **Backend**: Node.js, Express.js
- **Database**: MongoDB với Mongoose
- **Frontend**: EJS, Bootstrap 5, Font Awesome
- **Authentication**: Session-based với bcrypt
- **File Upload**: Multer

## Cài đặt và chạy

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Cài đặt MongoDB
Đảm bảo MongoDB đang chạy trên localhost:27017

### 3. Cấu hình Email (Tùy chọn)
Để sử dụng tính năng xác thực email, tạo file `.env` từ `config.example.env`:

```bash
cp config.example.env .env
```

Sau đó cập nhật thông tin email trong file `.env`:
- `EMAIL_USER`: Email Gmail của bạn
- `EMAIL_PASS`: App Password (không phải mật khẩu thường)
- `BASE_URL`: URL của ứng dụng (mặc định: http://localhost:3000)

**Lưu ý:** Để sử dụng Gmail:
1. Bật xác thực 2 bước
2. Tạo App Password
3. Sử dụng App Password làm `EMAIL_PASS`

### 4. Tạo dữ liệu mẫu
```bash
npm run reset-seed
```

### 5. Chạy server
```bash
npm start
```

Server sẽ chạy tại: http://localhost:3000

## Tài khoản mẫu

Sau khi chạy `npm run seed`, bạn có thể đăng nhập với các tài khoản sau:

### Admin
- **Email**: admin@planora.com
- **Password**: admin123
- **Quyền**: Quản lý toàn bộ hệ thống

### Khách hàng
- **Email**: customer1@example.com
- **Password**: customer123
- **Quyền**: Thuê dịch vụ, đặt hàng

### Chủ shop
- **Email**: shopowner1@example.com
- **Password**: shop123
- **Quyền**: Quản lý shop và dịch vụ

## Cấu trúc dự án

```
planora/
├── app.js                 # File chính
├── config/
│   └── database.js       # Cấu hình database
├── controllers/
│   └── adminController.js # Controller admin
├── middleware/
│   └── auth.js           # Middleware xác thực
├── models/               # Mongoose models
│   ├── User.js
│   ├── Shop.js
│   ├── Service.js
│   ├── Order.js
│   └── Review.js
├── routes/               # Routes
│   ├── adminRoutes.js
│   ├── authRoutes.js
│   └── customerRoutes.js
├── views/                # EJS templates
│   ├── layouts/
│   ├── auth/
│   ├── customer/
│   └── admin/
├── public/               # Static files
│   ├── css/
│   └── js/
└── scripts/
    └── seed.js           # Script tạo dữ liệu mẫu
```

## API Endpoints

### Authentication
- `GET /login` - Trang đăng nhập
- `POST /login` - Xử lý đăng nhập
- `GET /register` - Trang đăng ký
- `POST /register` - Xử lý đăng ký
- `POST /logout` - Đăng xuất

### Customer
- `GET /customer/dashboard` - Dashboard khách hàng
- `GET /customer/services` - Danh sách dịch vụ
- `GET /customer/services/:id` - Chi tiết dịch vụ
- `GET /customer/cart` - Giỏ hàng
- `POST /customer/cart/add` - Thêm vào giỏ hàng
- `GET /customer/checkout` - Thanh toán
- `POST /customer/order` - Đặt hàng
- `GET /customer/orders` - Lịch sử đơn hàng

### Admin
- `GET /admin/dashboard` - Dashboard admin
- `GET /admin/users` - Quản lý người dùng
- `GET /admin/shops` - Quản lý shop
- `GET /admin/services` - Quản lý dịch vụ
- `GET /admin/orders` - Quản lý đơn hàng
- `GET /admin/reviews` - Quản lý đánh giá
- `GET /admin/reports` - Báo cáo

## Tính năng sắp tới

- [ ] Tích hợp thanh toán (Momo, ZaloPay, thẻ)
- [ ] Upload ảnh dịch vụ
- [ ] Chat real-time
- [ ] Push notifications
- [ ] Mobile app
- [ ] API cho mobile

## Đóng góp

1. Fork dự án
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Liên hệ

- **Email**: contact@planora.com
- **Phone**: 1900-1234
- **Website**: https://planora.com
