const express = require('express');
const Service = require('../models/Service');
const Order = require('../models/Order');
const Review = require('../models/Review');
const User = require('../models/User');
const Category = require('../models/Category');
const { requireAuth, requireShop } = require('../middleware/auth');
const { incrementSoldCountForOrder } = require('../services/orderService');

const router = express.Router();

// Shop model removed: shop is represented via User.role + User.shopRequest

// Test customer page
router.get('/test', (req, res) => {
  res.render('customer/test', { user: req.user });
});

// Test all customer pages
router.get('/test-pages', requireAuth, (req, res) => {
  res.render('customer/test-pages', { 
    title: 'Test Customer Pages',
    user: req.user 
  });
});

// Debug route
router.get('/debug', requireAuth, (req, res) => {
  res.json({
    session: req.session,
    user: req.user,
    userId: req.session.userId,
    userRole: req.user ? req.user.role : 'No user'
  });
});

// Simple test route
router.get('/simple-test', requireAuth, (req, res) => {
  res.render('customer/simple-test', {
    title: 'Simple Test',
    user: req.user
  });
});

// Link test route
router.get('/link-test', requireAuth, (req, res) => {
  res.render('customer/link-test', {
    title: 'Link Test',
    user: req.user
  });
});

// Quick test route
router.get('/quick-test', requireAuth, (req, res) => {
  res.render('customer/quick-test', {
    title: 'Quick Test',
    user: req.user
  });
});

// Service detail page
router.get('/services/:id', requireAuth, async (req, res) => {
  try {
    console.log('Service ID:', req.params.id);
    
    // Validate service ID
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('Invalid service ID format');
      req.flash('error', 'ID dịch vụ không hợp lệ');
      return res.redirect('/customer/services');
    }

    const service = await Service.findById(req.params.id)
      .populate('shop', 'shopName email phone address');
    
    console.log('Found service:', service ? 'yes' : 'no');
    
    if (!service) {
      req.flash('error', 'Dịch vụ không tồn tại');
      return res.redirect('/customer/services');
    }

    // Lấy reviews từ collection Review
    const reviews = await Review.find({ 
      service: service._id,
      isVisible: true 
    })
    .populate('customer', 'fullName avatar')
    .sort({ createdAt: -1 });

    // Render the service-detail view
    return res.render('customer/service-detail', {
      title: 'Chi tiết dịch vụ',
      user: req.user,
      service,
      reviews,
      layout: 'layouts/main'
    });
  } catch (error) {
    console.error('Service detail error:', error);
    req.flash('error', 'Có lỗi xảy ra khi tải chi tiết dịch vụ');
    res.redirect('/customer/services');
  }
});

// Dashboard khách hàng - Không yêu cầu đăng nhập
router.get('/dashboard', async (req, res) => {
  try {
    console.log('Customer dashboard - User:', req.user ? req.user.fullName : 'Not logged in');
    console.log('Customer dashboard - Role:', req.user ? req.user.role : 'No role');
    
    // Lấy danh mục từ database
    const categories = await Category.find().sort({ name: 1 });

    // Lấy dịch vụ nổi bật (populate shop + category)
    const services = await Service.find({ status: 'active' })
      .populate('shop', 'shopName rating')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(12);

    console.log('Dashboard - loaded categories:', categories.length, 'services:', services.length);

    // Lấy đơn hàng gần đây (chỉ khi đã đăng nhập)
    let recentOrders = [];
    if (req.user) {
      recentOrders = await Order.find({ customer: req.user._id })
        .populate('shop', 'shopName')
        .populate('services.service', 'name')
        .sort({ createdAt: -1 })
        .limit(5);
    }

    res.render('customer/dashboard', {
      title: 'Thuê dịch vụ sự kiện',
      user: req.user,
      services,
      categories,
      recentOrders
    });
  } catch (error) {
    console.error('Customer dashboard error:', error);
    req.flash('error', 'Có lỗi xảy ra');
    res.redirect('/');
  }
});

// Xem danh sách dịch vụ
router.get('/services', async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search } = req.query;
  let query = { status: 'active' };

    // Filter theo category
    if (category) {
      // category may be an ObjectId (from links) or a name string
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(category)) {
        query.category = category;
      } else {
        // try find category by name
        const catDoc = await Category.findOne({ name: category });
        if (catDoc) query.category = catDoc._id;
      }
    }

    // Filter theo giá
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }

    // Search theo tiêu đề
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const services = await Service.find(query)
      .populate('shop', 'shopName rating')
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    console.log('Services list - query:', JSON.stringify(query), 'found:', services.length);

    // Load categories from DB
    const categories = await Category.find().sort({ name: 1 });

    res.render('customer/services', {
      title: 'Tìm dịch vụ sự kiện',
      user: req.user,
      services,
      categories,
      currentCategory: category,
      currentSearch: search,
      currentMinPrice: minPrice,
      currentMaxPrice: maxPrice
    });
  } catch (error) {
    console.error('Services list error:', error);
    req.flash('error', 'Có lỗi xảy ra khi tải danh sách dịch vụ');
    res.redirect('/customer/dashboard');
  }
});

// Chi tiết dịch vụ
router.get('/services/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('shop', 'shopName rating totalReviews')
      .populate('category', 'name')
      .populate({
        path: 'reviews',
        populate: {
          path: 'customer',
          select: 'fullName avatar'
        }
      });

    if (!service) {
      req.flash('error', 'Dịch vụ không tồn tại');
      return res.redirect('/customer/services');
    }

    // Lấy đánh giá
    const reviews = await Review.find({ service: service._id, isVisible: true })
      .populate('customer', 'fullName avatar')
      .sort({ createdAt: -1 }) || [];

    res.render('customer/service-detail', {
      title: service.title,
      user: req.user,
      service,
      reviews
    });
  } catch (error) {
    console.error('Service detail error:', error);
    req.flash('error', 'Có lỗi xảy ra khi tải chi tiết dịch vụ');
    res.redirect('/customer/services');
  }
});

// Giỏ hàng
router.get('/cart', requireAuth, async (req, res) => {
  try {
    const cart = req.session.cart || [];
    
    // Lấy thông tin chi tiết dịch vụ trong giỏ hàng
    const serviceIds = cart.map(item => item.serviceId);
    const services = await Service.find({ _id: { $in: serviceIds } })
      .populate('shop', 'shopName rating totalReviews');

    const cartWithDetails = cart.map(cartItem => {
      const service = services.find(s => s._id.toString() === cartItem.serviceId);
      return {
        ...cartItem,
        service
      };
    });

    res.render('customer/cart', {
      title: 'Giỏ hàng',
      user: req.user,
      cart: cartWithDetails
    });
  } catch (error) {
    console.error('Cart error:', error);
    req.flash('error', 'Có lỗi xảy ra khi tải giỏ hàng');
    res.redirect('/customer/dashboard');
  }
});

// Get cart count
router.get('/cart/count', requireAuth, (req, res) => {
  try {
    const cart = req.session.cart || [];
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    res.json({ count });
  } catch (error) {
    console.error('Cart count error:', error);
    res.json({ count: 0 });
  }
});

// Thêm vào giỏ hàng (không gộp item khác ngày, kiểm tra ngày quá khứ)
router.post('/cart/add', requireAuth, async (req, res) => {
  try {
    const { serviceId, quantity, eventDate, eventLocation, notes } = req.body;
    if (!serviceId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc (serviceId, quantity)'
      });
    }
    if (!eventDate) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ngày sự kiện'
      });
    }
    // Kiểm tra ngày không phải quá khứ
    const today = new Date();
    today.setHours(0,0,0,0);
    const eventDateObj = new Date(eventDate);
    if (eventDateObj < today) {
      return res.status(400).json({
        success: false,
        message: 'Không thể đặt dịch vụ cho ngày trong quá khứ'
      });
    }
    if (eventLocation !== undefined && (!eventLocation || eventLocation.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Địa điểm sự kiện không được để trống'
      });
    }
    if (!req.session.cart) req.session.cart = [];
    // Validate serviceId exists
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.json({ success: false, message: 'Không tìm thấy dịch vụ' });
    }
    // Không gộp item khác ngày
    const existingItem = req.session.cart.find(item => item.serviceId === serviceId && item.eventDate === eventDate);
    if (existingItem) {
      existingItem.quantity += parseInt(quantity);
      existingItem.eventLocation = eventLocation;
      existingItem.notes = notes;
    } else {
      req.session.cart.push({
        serviceId,
        quantity: parseInt(quantity),
        eventDate,
        eventLocation,
        notes
      });
    }
    res.json({
      success: true,
      message: 'Đã thêm vào giỏ hàng',
      count: req.session.cart.reduce((total, item) => total + item.quantity, 0)
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.json({ success: false, message: 'Có lỗi xảy ra khi thêm vào giỏ hàng' });
  }
});

// API cập nhật số lượng giỏ hàng
router.post('/cart/update', requireAuth, (req, res) => {
  try {
    const { serviceId, eventDate, quantity } = req.body;
    if (!serviceId || !eventDate) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin' });
    }
    if (!req.session.cart) req.session.cart = [];
    const item = req.session.cart.find(i => i.serviceId === serviceId && i.eventDate === eventDate);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy mục trong giỏ hàng' });
    }
    item.quantity = Math.max(1, parseInt(quantity));
    res.json({ success: true, message: 'Đã cập nhật số lượng', quantity: item.quantity });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật số lượng' });
  }
});

// Xóa khỏi giỏ hàng (xét cả eventDate nếu có)
router.post('/cart/remove', requireAuth, (req, res) => {
  const { serviceId, eventDate } = req.body;
  if (eventDate) {
    req.session.cart = req.session.cart.filter(item => !(item.serviceId === serviceId && item.eventDate === eventDate));
  } else {
    req.session.cart = req.session.cart.filter(item => item.serviceId !== serviceId);
  }
  req.flash('success', 'Đã xóa khỏi giỏ hàng');
  res.redirect('/customer/cart');
});

// Checkout  
router.get('/checkout', requireAuth, async (req, res) => {
  try {
    const cart = req.session.cart || [];
    if (cart.length === 0) {
      req.flash('error', 'Giỏ hàng trống');
      return res.redirect('/customer/cart');
    }

    // Lấy thông tin dịch vụ
    const serviceIds = cart.map(item => item.serviceId);
    const services = await Service.find({ _id: { $in: serviceIds } })
      .populate('shop', 'shopName');

    // Process cart items with validation and cleaning
    const cartWithDetails = cart.map(cartItem => {
      const service = services.find(s => s._id.toString() === cartItem.serviceId);
      return {
        ...cartItem,
        service,
        total: service.price * cartItem.quantity,
        // Clean event location if exists
        eventLocation: cleanInput(cartItem.eventLocation) || '',
        eventDate: cleanInput(cartItem.eventDate)
      };
    });

    // Get user's default info for prefilling
    const defaultUserInfo = {
      phone: cleanInput(req.user.phone) || '',
      address: cleanInput(req.user.address) || ''
    };

    const totalAmount = cartWithDetails.reduce((sum, item) => sum + item.total, 0);

    res.render('customer/checkout', {
      title: 'Thanh toán',
      user: req.user,
      cart: cartWithDetails,
      totalAmount,
      defaultUserInfo
    });
  } catch (error) {
    console.error('Checkout error:', error);
    req.flash('error', 'Có lỗi xảy ra khi tải trang thanh toán');
    res.redirect('/customer/cart');
  }
});

// Thanh toán trực tiếp (không cần nhập thông tin thêm)
router.post('/payment', requireAuth, async (req, res) => {
    try {
        console.log('=== BẮT ĐẦU XỬ LÝ THANH TOÁN TRỰC TIẾP ===');
        console.log('Request body nhận được:', req.body);
        
        const cart = req.session.cart || [];
        if (cart.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Giỏ hàng trống'
            });
        }

        // Lấy danh sách items được chọn
        const selectedItems = req.body.selectedItems || [];
        console.log('Selected items:', selectedItems);
        
        if (selectedItems.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Không có dịch vụ nào được chọn để thanh toán'
            });
        }

        // Lọc cart chỉ lấy những item được chọn
        const cartToProcess = cart.filter(cartItem => 
            selectedItems.some(selected => 
                selected.serviceId === cartItem.serviceId && 
                selected.eventDate === cartItem.eventDate
            )
        );
        
        console.log('Cart to process:', cartToProcess.length, 'items');

        // Nhóm các items theo ngày sự kiện
        const itemsByDate = {};
        cartToProcess.forEach(item => {
            const eventDate = item.eventDate;
            if (!itemsByDate[eventDate]) {
                itemsByDate[eventDate] = [];
            }
            itemsByDate[eventDate].push(item);
        });

        console.log('Items grouped by date:', Object.keys(itemsByDate));

        // Nếu có nhiều ngày khác nhau, gộp thành 1 đơn hàng với ngày sớm nhất
        const eventDates = Object.keys(itemsByDate).sort();
        const primaryEventDate = eventDates[0]; // Ngày sớm nhất
        
        if (eventDates.length > 1) {
            console.log(`Multiple dates found (${eventDates.length}), using primary date: ${primaryEventDate}`);
        }

        // Gộp tất cả items từ các ngày khác nhau
        const allItems = cartToProcess;

        // Lấy thông tin dịch vụ
        const serviceIds = allItems.map(item => item.serviceId);
        const services = await Service.find({ _id: { $in: serviceIds } });

        // Tạo items cho order
        const orderItems = allItems.map(cartItem => {
            const service = services.find(s => s._id.toString() === cartItem.serviceId);
            if (!service) {
                throw new Error(`Không tìm thấy dịch vụ với ID: ${cartItem.serviceId}`);
            }
            return {
                service: service._id,
                quantity: cartItem.quantity,
                price: service.price
            };
        });

        // Tính tổng tiền
        const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Get shop ID (assume all services are from same shop)
        const shopId = services[0].shop;
        if (!shopId) {
            throw new Error('Không tìm thấy thông tin cửa hàng');
        }

        console.log('=== CREATING SINGLE ORDER ===');
        console.log('Primary event date:', primaryEventDate);
        console.log('Total items:', orderItems.length);
        console.log('Total amount:', totalAmount);

        // Tạo 1 đơn hàng duy nhất
        const order = new Order({
            customer: req.user._id,
            shop: shopId,
            services: orderItems.map(item => ({
                service: item.service,
                quantity: item.quantity,
                price: item.price
            })),
            eventDate: primaryEventDate, // Sử dụng ngày sớm nhất
            eventLocation: allItems[0].eventLocation || 'Địa điểm sẽ được cập nhật',
            deliveryAddress: allItems[0].eventLocation || 'Địa điểm sẽ được cập nhật',
            contactPhone: req.user.phone || '0000000000',
            notes: eventDates.length > 1 ? `Đơn hàng gộp cho các ngày: ${eventDates.join(', ')}` : '',
            paymentMethod: 'vnpay',
            totalAmount: totalAmount,
            status: 'pending',
            paymentStatus: 'pending'
        });

        await order.save();

        // Tạo VNPay URL
        try {
            const amount = Math.round(Math.abs(order.totalAmount));
            const orderInfo = `Thanh toan don hang ${order._id}`;
            
            const paymentUrl = await vnPayService.createVNPayUrl(
                order._id.toString(),
                amount,
                orderInfo
            );

            // Xóa các item đã thanh toán khỏi giỏ hàng
            req.session.cart = cart.filter(cartItem => 
                !selectedItems.some(selected => 
                    selected.serviceId === cartItem.serviceId && 
                    selected.eventDate === cartItem.eventDate
                )
            );

            console.log('VNPay URL created:', paymentUrl);
            
            return res.status(200).json({
                success: true,
                paymentUrl: paymentUrl,
                orderCount: 1,
                message: eventDates.length > 1 ? `Đã gộp ${eventDates.length} ngày khác nhau thành 1 đơn hàng` : undefined
            });
        } catch (error) {
            console.error('VNPay Error:', error);
            await Order.findByIdAndDelete(order._id);
            throw error;
        }

    } catch (error) {
        console.error('Payment Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi xử lý thanh toán: ' + error.message
        });
    }
});

// Đặt hàng (route cũ - có thể giữ lại để tương thích)
const vnPayService = require('../services/vnPayService');

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Utility function to clean input values
const cleanInput = (value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') {
        const cleaned = value.trim();
        return cleaned === '' ? undefined : cleaned;
    }
    return value;
};

router.post('/order', requireAuth, async (req, res) => {
    try {
        console.log('=== BẮT ĐẦU XỬ LÝ ĐƠN HÀNG ===');
        console.log('Request body nhận được:', req.body);
        
        const cart = req.session.cart || [];
        if (cart.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Giỏ hàng trống'
            });
        }

        // Lấy danh sách items được chọn (nếu có)
        const selectedItems = req.body.selectedItems || [];
        console.log('Selected items:', selectedItems);
        
        // Lọc cart chỉ lấy những item được chọn
        let cartToProcess = cart;
        if (selectedItems.length > 0) {
            cartToProcess = cart.filter(cartItem => 
                selectedItems.some(selected => 
                    selected.serviceId === cartItem.serviceId && 
                    selected.eventDate === cartItem.eventDate
                )
            );
        }
        
        if (cartToProcess.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Không có dịch vụ nào được chọn để thanh toán'
            });
        }
        
        console.log('Cart to process:', cartToProcess.length, 'items');

        // Lấy và xác thực dữ liệu từ form (không cần eventDate vì đã có từ cart)
        const formData = {
            eventLocation: cleanInput(req.body.eventLocation),
            contactPhone: cleanInput(req.body.contactPhone) || cleanInput(req.user.phone),
            notes: cleanInput(req.body.notes) || ''
        };

        console.log('Form data after cleaning:', formData);

        const eventLocation = formData.eventLocation;
        const contactPhone = formData.contactPhone || req.user.phone;
        const paymentMethod = 'vnpay'; // Chỉ hỗ trợ VNPay

        // Validate event location 
        if (!eventLocation || eventLocation.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Vui lòng nhập địa điểm sự kiện'
            });
        }
        
        // Clean and validate event location
        const cleanedEventLocation = eventLocation.trim();
        if (cleanedEventLocation.length < 5) {
            return res.status(400).json({
                success: false,
                error: 'Địa điểm sự kiện phải có ít nhất 5 ký tự'
            });
        }

        // Validate phone number
        if (!contactPhone || !/^\d{10}$/.test(contactPhone)) {
            return res.status(400).json({
                success: false,
                error: 'Số điện thoại không hợp lệ (phải có 10 chữ số)'
            });
        }

        // Lấy thông tin dịch vụ từ database
        const serviceIds = cartToProcess.map(item => item.serviceId);
        const services = await Service.find({ _id: { $in: serviceIds } });

        // Tạo items cho order
        const orderItems = cartToProcess.map(cartItem => {
            const service = services.find(s => s._id.toString() === cartItem.serviceId);
            if (!service) {
                throw new Error(`Không tìm thấy dịch vụ với ID: ${cartItem.serviceId}`);
            }
            return {
                service: service._id,
                quantity: cartItem.quantity,
                price: service.price
            };
        });

        // Tính tổng tiền
        const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Get shop ID from the first service (assuming all services are from same shop)
        const shopId = services[0].shop;
        if (!shopId) {
            throw new Error('Không tìm thấy thông tin cửa hàng');
        }

        console.log('=== CHUẨN BỊ TẠO ĐƠN HÀNG ===');
        console.log('Shop ID:', shopId);
        console.log('Danh sách items:', orderItems);
        console.log('Tổng tiền:', totalAmount);

        // Lấy eventDate từ item đầu tiên (giả sử tất cả items cùng ngày sự kiện)
        const eventDate = cartToProcess[0].eventDate;

        // Create new order
        const order = new Order({
            customer: req.user._id,
            shop: shopId,
            services: orderItems.map(item => ({
                service: item.service,
                quantity: item.quantity,
                price: item.price
            })),
            eventDate: eventDate,
            eventLocation: eventLocation,
            deliveryAddress: eventLocation, // Using eventLocation as delivery address
            contactPhone: contactPhone,
            notes: formData.notes || '',
            paymentMethod: paymentMethod,
            totalAmount: totalAmount,
            status: 'pending',
            paymentStatus: 'pending'
        });

        console.log('Dữ liệu đơn hàng trước khi lưu:', order);

        await order.save();
        
        // Xóa các item đã thanh toán khỏi giỏ hàng
        if (selectedItems.length > 0) {
            req.session.cart = cart.filter(cartItem => 
                !selectedItems.some(selected => 
                    selected.serviceId === cartItem.serviceId && 
                    selected.eventDate === cartItem.eventDate
                )
            );
        } else {
            req.session.cart = [];
        }

        console.log('\n=== PAYMENT PROCESSING ===');
        // Chỉ xử lý VNPay
        try {
            console.log('Creating VNPay order...');
            const amount = Math.round(Math.abs(order.totalAmount));
            const orderInfo = `Thanh toan don hang ${order._id}`;
            console.log('VNPay order data:', {
                orderId: order._id.toString(),
                amount: amount,
                orderInfo: orderInfo
            });

            const paymentUrl = await vnPayService.createVNPayUrl(
                order._id.toString(),
                amount,
                orderInfo
            );

            console.log('VNPay URL created:', paymentUrl);
            return res.status(200).json({
                success: true,
                paymentUrl: paymentUrl
            });
        } catch (error) {
            console.error('VNPay Error:', error);
            await Order.findByIdAndDelete(order._id);
            return res.status(400).json({
                success: false,
                error: 'Lỗi xử lý thanh toán: ' + error.message
            });
        }
    } catch (error) {
        console.error('Order Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi xử lý đơn hàng: ' + error.message
        });
    }
});

router.get('/vnpay-return', async (req, res) => {
    try {
        console.log('=== VNPAY RETURN CALLBACK ===');
        console.log('Query params:', req.query);
        
        const vnpParams = req.query;
        const isValidSignature = vnPayService.verifyReturnUrl(vnpParams);
        
        console.log('Signature validation:', isValidSignature);

        if (isValidSignature) {
            const orderId = vnpParams['vnp_TxnRef'];
            const vnpResponseCode = vnpParams['vnp_ResponseCode'];
            
            console.log('Order ID:', orderId);
            console.log('Response Code:', vnpResponseCode);

            if (vnpResponseCode === '00') {
                const updatedOrder = await Order.findByIdAndUpdate(orderId, {
                    status: 'paid',
                    paymentStatus: 'completed',
                    paymentDetails: vnpParams
                }, { new: true });
                
                console.log('Order updated successfully:', updatedOrder);
                req.flash('success', 'Thanh toán thành công');
            } else {
                await Order.findByIdAndUpdate(orderId, {
                    status: 'pending',
                    paymentStatus: 'failed',
                    paymentDetails: vnpParams
                });
                req.flash('error', 'Thanh toán thất bại');
            }
        } else {
            console.log('Invalid signature');
            req.flash('error', 'Chữ ký không hợp lệ');
        }

        res.redirect('/customer/orders');
    } catch (error) {
        console.error('VNPay Return Error:', error);
        req.flash('error', 'Có lỗi xảy ra khi xử lý kết quả thanh toán');
        res.redirect('/customer/orders');
    }
});// Lịch sử đơn hàng
router.get('/orders', requireAuth, async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('shop', 'shopName')
      .populate('services.service', 'name')
      .sort({ createdAt: -1 });

    res.render('customer/orders', {
      title: 'Lịch sử đơn hàng',
      user: req.user,
      orders
    });
  } catch (error) {
    console.error('Orders list error:', error);
    req.flash('error', 'Có lỗi xảy ra khi tải lịch sử đơn hàng');
    res.redirect('/customer/dashboard');
  }
});

// --- Shop: view orders for the logged-in shop ---
router.get('/shop/orders', requireShop, async (req, res) => {
  try {
    const query = { shop: req.user._id };
    // Optional filter to show orders only for a specific service
    if (req.query.serviceId && req.query.serviceId.match(/^[0-9a-fA-F]{24}$/)) {
      query['services.service'] = req.query.serviceId;
    }

    const orders = await Order.find(query)
      .populate('customer', 'fullName email phone')
      .populate('services.service', 'title price')
      .sort({ createdAt: -1 });

    res.render('shop/orders', {
      title: 'Đơn hàng shop',
      user: req.user,
      orders
    });
  } catch (error) {
    console.error('Shop orders list error:', error);
    req.flash('error', 'Có lỗi xảy ra khi tải đơn hàng của shop');
    res.redirect('/customer/dashboard');
  }
});

// Shop: order detail
router.get('/shop/orders/:id', requireShop, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, shop: req.user._id })
      .populate('customer', 'fullName email phone')
      .populate({ path: 'services.service', select: 'title price description' });

    if (!order) {
      req.flash('error', 'Đơn hàng không tồn tại hoặc bạn không có quyền xem');
      return res.redirect('/customer/shop/orders');
    }

    res.render('shop/order-detail', {
      title: 'Chi tiết đơn hàng',
      user: req.user,
      order
    });
  } catch (error) {
    console.error('Shop order detail error:', error);
    req.flash('error', 'Có lỗi xảy ra khi tải chi tiết đơn hàng');
    res.redirect('/customer/shop/orders');
  }
});

// Shop requests customer to confirm completion
router.post('/shop/orders/:id/request-confirm', requireShop, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, shop: req.user._id });
    if (!order) {
      req.flash('error', 'Đơn hàng không tồn tại hoặc bạn không có quyền thực hiện');
      return res.redirect('/customer/shop/orders');
    }

    // Only allow if not already completed/cancelled
    if (order.status === 'completed' || order.status === 'cancelled') {
      req.flash('warning', 'Đơn hàng đã hoàn thành hoặc đã hủy');
      return res.redirect('/customer/shop/orders/' + order._id);
    }

    // Mark as shop-confirmed so customer knows to confirm
    order.status = 'confirmed';
    await order.save();

    // Optional: TODO send email/notification to customer here using emailService

    req.flash('success', 'Đã gửi yêu cầu xác nhận đến khách hàng');
    res.redirect('/customer/shop/orders/' + order._id);
  } catch (err) {
    console.error('Shop request confirm error:', err);
    req.flash('error', 'Có lỗi xảy ra');
    res.redirect('/customer/shop/orders');
  }
});

// Customer confirms order completion (final)
router.post('/orders/:id/confirm', requireAuth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
    if (!order) {
      req.flash('error', 'Đơn hàng không tồn tại');
      return res.redirect('/customer/orders');
    }

    // Only allow if shop already requested confirmation (status === 'confirmed')
    if (order.status !== 'confirmed') {
      req.flash('warning', 'Đơn hàng chưa được shop xác nhận để yêu cầu hoàn tất');
      return res.redirect('/customer/orders/' + order._id);
    }

    const prevStatus = order.status;
    order.status = 'completed';
    order.updatedAt = Date.now();
    await order.save();

    // Increment sold counts for the services in this order
    try {
      await incrementSoldCountForOrder(order._id);
    } catch (err) {
      console.error('Error incrementing soldCount on customer confirm:', err);
    }

    req.flash('success', 'Bạn đã xác nhận hoàn thành. Cảm ơn!');
    res.redirect('/customer/orders/' + order._id);
  } catch (err) {
    console.error('Customer confirm error:', err);
    req.flash('error', 'Có lỗi xảy ra khi xác nhận');
    res.redirect('/customer/orders');
  }
});

// Hủy đơn hàng
router.post('/orders/:id/cancel', requireAuth, async (req, res) => {
  try {
    const order = await Order.findOne({ 
      _id: req.params.id, 
      customer: req.user._id,
      status: 'pending'
    });

    if (!order) {
      req.flash('error', 'Không thể hủy đơn hàng này');
      return res.redirect('/customer/orders');
    }

    order.status = 'cancelled';
    await order.save();

    req.flash('success', 'Đã hủy đơn hàng');
    res.redirect('/customer/orders');
  } catch (error) {
    console.error('Cancel order error:', error);
    req.flash('error', 'Có lỗi xảy ra khi hủy đơn hàng');
    res.redirect('/customer/orders');
  }
});

// Đánh giá dịch vụ
router.get('/reviews/:orderId', requireAuth, async (req, res) => {
  try {
    const order = await Order.findOne({ 
      _id: req.params.orderId, 
      customer: req.user._id,
      status: 'completed'
    }).populate('services.service', 'name');

    if (!order) {
      req.flash('error', 'Đơn hàng không tồn tại hoặc chưa hoàn thành');
      return res.redirect('/customer/orders');
    }

    res.render('customer/review', {
      title: 'Đánh giá dịch vụ',
      user: req.user,
      order
    });
  } catch (error) {
    console.error('Review form error:', error);
    req.flash('error', 'Có lỗi xảy ra');
    res.redirect('/customer/orders');
  }
});

        // Gửi đánh giá
        router.post('/reviews', requireAuth, async (req, res) => {
          try {
            const { orderId, serviceId, rating, comment } = req.body;

            const order = await Order.findOne({ 
              _id: orderId, 
              customer: req.user._id,
              status: 'completed'
            });

            if (!order) {
              req.flash('error', 'Đơn hàng không tồn tại hoặc chưa hoàn thành');
              return res.redirect('/customer/orders');
            }

            const service = await Service.findById(serviceId);
            if (!service) {
              req.flash('error', 'Dịch vụ không tồn tại');
              return res.redirect('/customer/orders');
            }

            // Tạo review
            const review = new Review({
              customer: req.user._id,
              service: serviceId,
              shop: service.shop,
              order: orderId,
              rating: parseInt(rating),
              comment
            });

            await review.save();

            // Cập nhật rating của service
            const reviews = await Review.find({ service: serviceId });
            const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
            
            await Service.findByIdAndUpdate(serviceId, {
              rating: avgRating,
              totalReviews: reviews.length
            });

            req.flash('success', 'Cảm ơn bạn đã đánh giá!');
            res.redirect('/customer/orders');
          } catch (error) {
            console.error('Submit review error:', error);
            req.flash('error', 'Có lỗi xảy ra khi gửi đánh giá');
            res.redirect('/customer/orders');
          }
        });

        // Profile page
        router.get('/profile', requireAuth, (req, res) => {
          res.render('customer/profile', {
            title: 'Thông tin cá nhân',
            user: req.user,
            layout: 'layouts/main'
          });
        });

        // Update profile
        router.post('/profile/update', requireAuth, async (req, res) => {
          try {
            console.log('=== UPDATE PROFILE ===');
            console.log('Request body:', req.body);
            
            const { fullName, phone, dateOfBirth, address, currentPassword, newPassword, confirmPassword } = req.body;
            
            const updateData = {
              fullName,
              phone,
              dateOfBirth,
              address
            };

            console.log('Update data (basic):', updateData);

            // Nếu có mật khẩu mới
            if (newPassword && newPassword.trim() !== '') {
              console.log('Processing password change...');
              
              // Validate current password
              if (!currentPassword || currentPassword.trim() === '') {
                console.log('Current password is required');
                req.flash('error', 'Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu');
                return res.redirect('/customer/profile');
              }

              // Verify current password
              const bcrypt = require('bcryptjs');
              const user = await User.findById(req.user._id);
              const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
              
              if (!isCurrentPasswordValid) {
                console.log('Current password is invalid');
                req.flash('error', 'Mật khẩu hiện tại không đúng');
                return res.redirect('/customer/profile');
              }

              // Validate new password
              if (newPassword.length < 6) {
                console.log('New password too short');
                req.flash('error', 'Mật khẩu mới phải có ít nhất 6 ký tự');
                return res.redirect('/customer/profile');
              }

              if (newPassword !== confirmPassword) {
                console.log('Password confirmation mismatch');
                req.flash('error', 'Mật khẩu xác nhận không khớp');
                return res.redirect('/customer/profile');
              }

              console.log('Hashing new password...');
              updateData.password = await bcrypt.hash(newPassword, 10);
              console.log('Password hashed successfully');
            }

            console.log('Final update data:', { ...updateData, password: updateData.password ? '***' : 'not changed' });

            await User.findByIdAndUpdate(req.user._id, updateData);
            console.log('User updated successfully');
            
            req.flash('success', 'Cập nhật thông tin thành công');
            res.redirect('/customer/profile');
          } catch (error) {
            console.error('Update profile error:', error);
            req.flash('error', 'Có lỗi xảy ra khi cập nhật thông tin: ' + error.message);
            res.redirect('/customer/profile');
          }
        });

        // Request to become shop (store request in User.shopRequest)
        router.post('/request-shop', requireAuth, async (req, res) => {
          try {
            const { shopName, description, address, phone, email, businessLicense } = req.body;

            // Basic validation
            if (!shopName || !description || !address || !phone || !email) {
              req.flash('error', 'Vui lòng điền đầy đủ các trường bắt buộc');
              return res.redirect('/customer/profile');
            }

            // Check if user already requested or is a shop
            const user = await User.findById(req.user._id);
            if (user.role === 'shop' || user.shopRequested) {
              req.flash('warning', 'Bạn đã gửi yêu cầu hoặc đã là Chủ shop.');
              return res.redirect('/customer/profile');
            }

            user.shopRequested = true;
            user.shopRequest = {
              shopName,
              description,
              address,
              phone,
              email,
              businessLicense: businessLicense || '',
              status: 'pending',
              requestedAt: new Date()
            };

            await user.save();

            req.flash('success', 'Yêu cầu trở thành Chủ shop đã được gửi. Admin sẽ xem xét và duyệt trong thời gian sớm nhất.');
            res.redirect('/customer/profile');
          } catch (error) {
            console.error('Request shop error:', error);
            req.flash('error', 'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.');
            res.redirect('/customer/profile');
          }
        });

        // Order detail
        router.get('/orders/:id', requireAuth, async (req, res) => {
          try {
            const order = await Order.findOne({ 
              _id: req.params.id, 
              customer: req.user._id 
            })
              .populate('shop', 'shopName')
              .populate({
                path: 'services.service',
                select: 'name price category description'
              });

            if (!order) {
              req.flash('error', 'Đơn hàng không tồn tại');
              return res.redirect('/customer/orders');
            }

            res.render('customer/order-detail', {
              title: 'Chi tiết đơn hàng',
              user: req.user,
              order
            });
          } catch (error) {
            console.error('Order detail error:', error);
            req.flash('error', 'Có lỗi xảy ra khi tải chi tiết đơn hàng');
            res.redirect('/customer/orders');
          }
        });

        module.exports = router;
