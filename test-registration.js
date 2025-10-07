require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

async function testRegistration() {
  try {
    // Xóa user test nếu tồn tại
    await User.deleteOne({ email: 'test-user@example.com' });
    
    console.log('🧪 Testing user registration with real email verification...');
    console.log('📧 Email will be sent to:', process.env.EMAIL_USER);
    
    // Tạo user test
    const testUser = new User({
      username: 'testuser123',
      email: process.env.EMAIL_USER, // Sử dụng email trong .env để có thể kiểm tra
      password: 'password123',
      fullName: 'Test User',
      phone: '0123456789',
      address: 'Test Address',
      role: 'customer',
      emailVerificationToken: 'test-token-' + Date.now(),
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    
    await testUser.save();
    console.log('✅ Test user created successfully');
    console.log('👤 User details:');
    console.log('   - Username:', testUser.username);
    console.log('   - Email:', testUser.email);
    console.log('   - Email Verified:', testUser.isEmailVerified);
    console.log('   - Verification Token:', testUser.emailVerificationToken);
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    mongoose.connection.close();
  }
}

testRegistration();