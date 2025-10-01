const express = require('express');
const Service = require('../models/Service');
const Order = require('../models/Order');
const Review = require('../models/Review');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Dashboard khách hàng
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const recentOrders = await Order.find({ customer: req.user._id })
      .populate('shop', 'shopName')
      .populate('services.service', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.render('customer/dashboard', {
      title: 'Dashboard Khách hàng',
      user: req.user,
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
    let query = { isActive: true };

    // Filter theo category
    if (category) {
      query.category = category;
    }

    // Filter theo giá
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }

    // Search theo tên
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const services = await Service.find(query)
      .populate('shop', 'shopName rating')
      .sort({ createdAt: -1 });

    const categories = ['sound', 'lighting', 'venue', 'furniture', 'mc', 'catering', 'decoration', 'photography'];

    res.render('customer/services', {
      title: 'Danh sách dịch vụ',
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
      .sort({ createdAt: -1 });

    res.render('customer/service-detail', {
      title: service.name,
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
router.get('/cart', requireAuth, (req, res) => {
  const cart = req.session.cart || [];
  res.render('customer/cart', {
    title: 'Giỏ hàng',
    cart
  });
});

// Thêm vào giỏ hàng
router.post('/cart/add', requireAuth, (req, res) => {
  try {
    const { serviceId, quantity } = req.body;
    
    if (!req.session.cart) {
      req.session.cart = [];
    }

    const existingItem = req.session.cart.find(item => item.serviceId === serviceId);
    if (existingItem) {
      existingItem.quantity += parseInt(quantity);
    } else {
      req.session.cart.push({
        serviceId,
        quantity: parseInt(quantity)
      });
    }

    req.flash('success', 'Đã thêm vào giỏ hàng');
    res.redirect('/customer/cart');
  } catch (error) {
    console.error('Add to cart error:', error);
    req.flash('error', 'Có lỗi xảy ra khi thêm vào giỏ hàng');
    res.redirect('back');
  }
});

// Xóa khỏi giỏ hàng
router.post('/cart/remove', requireAuth, (req, res) => {
  const { serviceId } = req.body;
  req.session.cart = req.session.cart.filter(item => item.serviceId !== serviceId);
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

    const cartWithDetails = cart.map(cartItem => {
      const service = services.find(s => s._id.toString() === cartItem.serviceId);
      return {
        ...cartItem,
        service,
        total: service.price * cartItem.quantity
      };
    });

    const totalAmount = cartWithDetails.reduce((sum, item) => sum + item.total, 0);

    res.render('customer/checkout', {
      title: 'Thanh toán',
      cart: cartWithDetails,
      totalAmount
    });
  } catch (error) {
    console.error('Checkout error:', error);
    req.flash('error', 'Có lỗi xảy ra khi tải trang thanh toán');
    res.redirect('/customer/cart');
  }
});

// Đặt hàng
router.post('/order', requireAuth, async (req, res) => {
  try {
    const { eventDate, eventLocation, deliveryAddress, contactPhone, paymentMethod, notes } = req.body;
    const cart = req.session.cart || [];

    if (cart.length === 0) {
      req.flash('error', 'Giỏ hàng trống');
      return res.redirect('/customer/cart');
    }

    // Lấy thông tin dịch vụ
    const serviceIds = cart.map(item => item.serviceId);
    const services = await Service.find({ _id: { $in: serviceIds } })
      .populate('shop');

    // Tạo order
    const order = new Order({
      customer: req.user._id,
      shop: services[0].shop._id, // Giả sử tất cả dịch vụ từ cùng 1 shop
      services: cart.map(cartItem => {
        const service = services.find(s => s._id.toString() === cartItem.serviceId);
        return {
          service: service._id,
          quantity: cartItem.quantity,
          price: service.price
        };
      }),
      totalAmount: cart.reduce((sum, item) => {
        const service = services.find(s => s._id.toString() === item.serviceId);
        return sum + (service.price * item.quantity);
      }, 0),
      paymentMethod,
      eventDate,
      eventLocation,
      deliveryAddress,
      contactPhone,
      notes
    });

    await order.save();

    // Xóa giỏ hàng
    req.session.cart = [];

    req.flash('success', 'Đặt hàng thành công!');
    res.redirect('/customer/orders');
  } catch (error) {
    console.error('Create order error:', error);
    req.flash('error', 'Có lỗi xảy ra khi đặt hàng');
    res.redirect('/customer/checkout');
  }
});

// Lịch sử đơn hàng
router.get('/orders', requireAuth, async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('shop', 'shopName')
      .populate('services.service', 'name')
      .sort({ createdAt: -1 });

    res.render('customer/orders', {
      title: 'Lịch sử đơn hàng',
      orders
    });
  } catch (error) {
    console.error('Orders list error:', error);
    req.flash('error', 'Có lỗi xảy ra khi tải lịch sử đơn hàng');
    res.redirect('/customer/dashboard');
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

module.exports = router;
