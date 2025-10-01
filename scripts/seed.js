const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Shop = require('../models/Shop');
const Service = require('../models/Service');

// Kết nối database
mongoose.connect('mongodb://localhost:27017/planora', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function seedData() {
  try {
    console.log('🌱 Bắt đầu tạo dữ liệu mẫu...');

    // Tạo admin user
    const adminUser = new User({
      username: 'admin',
      email: 'admin@planora.com',
      password: 'admin123',
      fullName: 'Administrator',
      phone: '0123456789',
      address: '123 Admin Street, Ho Chi Minh City',
      role: 'admin',
      isActive: true
    });
    await adminUser.save();
    console.log('✅ Đã tạo admin user');

    // Tạo customer users
    const customers = [
      {
        username: 'customer1',
        email: 'customer1@example.com',
        password: 'customer123',
        fullName: 'Nguyễn Văn A',
        phone: '0987654321',
        address: '456 Customer Street, Hanoi',
        role: 'customer'
      },
      {
        username: 'customer2',
        email: 'customer2@example.com',
        password: 'customer123',
        fullName: 'Trần Thị B',
        phone: '0912345678',
        address: '789 Customer Street, Da Nang',
        role: 'customer'
      }
    ];

    const createdCustomers = [];
    for (const customerData of customers) {
      const customer = new User(customerData);
      await customer.save();
      createdCustomers.push(customer);
    }
    console.log('✅ Đã tạo customer users');

    // Tạo shop owner
    const shopOwner = new User({
      username: 'shopowner1',
      email: 'shopowner1@example.com',
      password: 'shop123',
      fullName: 'Lê Văn C',
      phone: '0901234567',
      address: '321 Shop Street, Ho Chi Minh City',
      role: 'shop'
    });
    await shopOwner.save();
    console.log('✅ Đã tạo shop owner');

    // Tạo shop
    const shop = new Shop({
      owner: shopOwner._id,
      shopName: 'Event Pro Shop',
      description: 'Chuyên cung cấp dịch vụ sự kiện chuyên nghiệp',
      address: '123 Event Street, District 1, Ho Chi Minh City',
      phone: '0901234567',
      email: 'shopowner1@example.com',
      businessLicense: 'BL123456789',
      status: 'approved',
      rating: 4.5,
      totalReviews: 25,
      location: {
        type: 'Point',
        coordinates: [106.6297, 10.8231] // Ho Chi Minh City coordinates
      }
    });
    await shop.save();
    console.log('✅ Đã tạo shop');

    // Tạo services
    const services = [
      {
        shop: shop._id,
        name: 'Hệ thống âm thanh chuyên nghiệp',
        description: 'Hệ thống âm thanh chất lượng cao cho sự kiện lớn, bao gồm loa, micro, mixer và các thiết bị hỗ trợ.',
        category: 'sound',
        price: 500000,
        unit: 'event',
        rating: 4.8,
        totalReviews: 15,
        features: ['Loa JBL chuyên nghiệp', 'Micro không dây', 'Mixer 16 kênh', 'Kỹ thuật viên hỗ trợ'],
        capacity: 500,
        location: {
          type: 'Point',
          coordinates: [106.6297, 10.8231]
        }
      },
      {
        shop: shop._id,
        name: 'Hệ thống ánh sáng LED',
        description: 'Hệ thống ánh sáng LED hiện đại, tạo hiệu ứng đẹp mắt cho sự kiện.',
        category: 'lighting',
        price: 300000,
        unit: 'event',
        rating: 4.6,
        totalReviews: 12,
        features: ['LED Par 64', 'Moving Head', 'Laser show', 'Kỹ thuật viên ánh sáng'],
        capacity: 300,
        location: {
          type: 'Point',
          coordinates: [106.6297, 10.8231]
        }
      },
      {
        shop: shop._id,
        name: 'Bàn ghế tiệc cao cấp',
        description: 'Bộ bàn ghế tiệc cao cấp, phù hợp cho tiệc cưới, hội nghị.',
        category: 'furniture',
        price: 50000,
        unit: 'set',
        rating: 4.4,
        totalReviews: 8,
        features: ['Bàn tròn 10 người', 'Ghế bọc vải cao cấp', 'Khăn trải bàn', 'Giao hàng miễn phí'],
        capacity: 100,
        location: {
          type: 'Point',
          coordinates: [106.6297, 10.8231]
        }
      },
      {
        shop: shop._id,
        name: 'MC chuyên nghiệp',
        description: 'MC có kinh nghiệm, dẫn chương trình sự kiện một cách chuyên nghiệp.',
        category: 'mc',
        price: 2000000,
        unit: 'event',
        rating: 4.9,
        totalReviews: 20,
        features: ['Kinh nghiệm 5+ năm', 'Giọng nói hay', 'Tương tác tốt', 'Linh hoạt'],
        capacity: 1,
        location: {
          type: 'Point',
          coordinates: [106.6297, 10.8231]
        }
      }
    ];

    for (const serviceData of services) {
      const service = new Service(serviceData);
      await service.save();
    }
    console.log('✅ Đã tạo services');

    console.log('🎉 Hoàn thành tạo dữ liệu mẫu!');
    console.log('\n📋 Thông tin đăng nhập:');
    console.log('Admin: admin@planora.com / admin123');
    console.log('Customer: customer1@example.com / customer123');
    console.log('Shop Owner: shopowner1@example.com / shop123');

  } catch (error) {
    console.error('❌ Lỗi khi tạo dữ liệu mẫu:', error);
  } finally {
    mongoose.connection.close();
  }
}

seedData();
