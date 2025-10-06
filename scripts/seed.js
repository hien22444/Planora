const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Service = require('../models/Service');
const Category = require('../models/Category');

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
      role: 'shop',
      shopName: 'Event Pro Shop',
      shopAddress: '123 Event Street, District 1, Ho Chi Minh City',
      shopPhone: '0901234567',
      shopEmail: 'shopowner1@example.com'
    });
    await shopOwner.save();
    console.log('✅ Đã tạo shop owner');

    // Tạo danh mục (Category)
    const categoryNames = ['sound', 'lighting', 'furniture', 'decoration', 'photography', 'videography', 'entertainment', 'mc'];
    const existingCategories = await Category.find({ name: { $in: categoryNames } });
    const categoriesMap = {};

    for (const name of categoryNames) {
      let cat = existingCategories.find(c => c.name === name);
      if (!cat) {
        cat = new Category({ name, description: `${name} services` });
        await cat.save();
      }
      categoriesMap[name] = cat;
    }

    // Tạo services (tương thích với schema Service)
    const services = [
      {
        shop: shopOwner._id,
        title: 'Hệ thống âm thanh chuyên nghiệp',
        description: 'Hệ thống âm thanh chất lượng cao cho sự kiện lớn, bao gồm loa, micro, mixer và các thiết bị hỗ trợ.',
        category: categoriesMap['sound']._id,
        price: 500000,
        address: shopOwner.shopAddress || '123 Event Street, HCMC',
    status: 'active',
  images: ['/uploads/default-service.svg'],
  video: ''
      },
      {
        shop: shopOwner._id,
        title: 'Hệ thống ánh sáng LED',
        description: 'Hệ thống ánh sáng LED hiện đại, tạo hiệu ứng đẹp mắt cho sự kiện.',
        category: categoriesMap['lighting']._id,
        price: 300000,
        address: shopOwner.shopAddress || '123 Event Street, HCMC',
    status: 'active',
  images: ['/uploads/default-service.svg'],
  video: ''
      },
      {
        shop: shopOwner._id,
        title: 'Bàn ghế tiệc cao cấp',
        description: 'Bộ bàn ghế tiệc cao cấp, phù hợp cho tiệc cưới, hội nghị.',
        category: categoriesMap['furniture']._id,
        price: 50000,
        address: shopOwner.shopAddress || '123 Event Street, HCMC',
    status: 'active',
  images: ['/uploads/default-service.svg'],
  video: ''
      },
      {
        shop: shopOwner._id,
        title: 'MC chuyên nghiệp',
        description: 'MC có kinh nghiệm, dẫn chương trình sự kiện một cách chuyên nghiệp.',
        category: categoriesMap['mc']._id,
        price: 2000000,
        address: shopOwner.shopAddress || '123 Event Street, HCMC',
    status: 'active',
  images: ['/uploads/default-service.svg'],
  video: ''
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
