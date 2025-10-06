const User = require('../models/User');
// Shop model removed — shop is represented by User.role and User.shopRequest
const Service = require('../models/Service');
const Order = require('../models/Order');
const Review = require('../models/Review');

exports.dashboard = async (req, res) => {
  try {
    // Thống kê tổng quan
    const userCount = await User.countDocuments();
  // Count shops as users with role 'shop'
  const shopCount = await User.countDocuments({ role: 'shop' });
    const serviceCount = await Service.countDocuments();
    const orderCount = await Order.countDocuments();

    // Doanh thu 6 tháng gần nhất
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const revenueData = [];
    const orderData = [];
    const labels = [];
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const nextMonth = new Date(month);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      const monthOrders = await Order.find({
        createdAt: { $gte: month, $lt: nextMonth },
        paymentStatus: 'paid'
      });
      
      const revenue = monthOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      revenueData.push(revenue);
      orderData.push(monthOrders.length);
      labels.push(`Th${6-i}`);
    }

    // Cảnh báo
  const pendingShops = await User.countDocuments({ 'shopRequested': true, 'shopRequest.status': 'pending' });
    const reportedReviews = await Review.countDocuments({ isReported: true });
    const alerts = [];
    
    if (pendingShops > 0) {
      alerts.push(`${pendingShops} shop đang chờ duyệt`);
    }
    if (reportedReviews > 0) {
      alerts.push(`${reportedReviews} đánh giá bị báo cáo`);
    }

    res.render("admin/dashboard", {
      layout: 'layouts/admin',
      title: "Dashboard",
      userCount,
      shopCount,
      serviceCount,
      orderCount,
      revenueLabels: labels,
      revenueData,
      orderLabels: labels,
      orderData,
      alerts
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    req.flash('error', 'Có lỗi xảy ra khi tải dashboard');
    res.render("admin/dashboard", {
      layout: 'layouts/admin',
      title: "Dashboard",
      userCount: 0,
      shopCount: 0,
      serviceCount: 0,
      orderCount: 0,
      revenueLabels: [],
      revenueData: [],
      orderLabels: [],
      orderData: [],
      alerts: []
    });
  }
};

exports.manageUsers = async (req, res) => {
  try {
    const { role, status, search } = req.query;
    let query = {};

    if (role) query.role = role;
    if (status !== undefined) query.isActive = status === 'active';
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    res.render("admin/users", {
      title: "Người dùng",
      users,
      currentRole: role,
      currentStatus: status,
      currentSearch: search
    });
  } catch (error) {
    console.error('Manage users error:', error);
    req.flash('error', 'Có lỗi xảy ra khi tải danh sách người dùng');
    res.render("admin/users", {
      title: "Người dùng",
      users: [],
      currentRole: '',
      currentStatus: '',
      currentSearch: ''
    });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      req.flash('error', 'Người dùng không tồn tại');
      return res.redirect('/admin/users');
    }

    user.isActive = !user.isActive;
    await user.save();

    req.flash('success', `Đã ${user.isActive ? 'kích hoạt' : 'khóa'} tài khoản`);
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Toggle user status error:', error);
    req.flash('error', 'Có lỗi xảy ra');
    res.redirect('/admin/users');
  }
};

exports.manageShops = async (req, res) => {
  try {
    const { status, search } = req.query;
    let query;

    if (status) {
      // filter by status on shopRequest
      query = { 'shopRequest.status': status };
    } else {
      // show approved shops and pending requests
      query = { $or: [ { role: 'shop' }, { shopRequested: true } ] };
    }
    if (search) {
      query.$or = [
        { 'shopRequest.shopName': { $regex: search, $options: 'i' } },
        { 'shopRequest.email': { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }

    const shops = await User.find(query)
      .select('fullName email phone shopRequest role shopRequested createdAt')
      .sort({ 'shopRequest.requestedAt': -1 });

    res.render("admin/shops", {
      title: "Shop",
      shops,
      currentStatus: status,
      currentSearch: search
    });
  } catch (error) {
    console.error('Manage shops error:', error);
    req.flash('error', 'Có lỗi xảy ra khi tải danh sách shop');
    res.render("admin/shops", {
      title: "Shop",
      shops: [],
      currentStatus: '',
      currentSearch: ''
    });
  }
};

exports.approveShop = async (req, res) => {
  try {
    // req.params.id is user id (we changed admin routes to pass user id)
    const user = await User.findById(req.params.id);
    if (!user || !user.shopRequested || !user.shopRequest) {
      req.flash('error', 'Yêu cầu shop không tồn tại');
      return res.redirect('/admin/shops');
    }

  user.shopRequest.status = 'approved';
  user.shopRequested = false; // clear request flag
  user.role = 'shop';
  // copy request data into shop profile fields for easy population
  user.shopName = user.shopRequest.shopName;
  user.shopAddress = user.shopRequest.address;
  user.shopPhone = user.shopRequest.phone || user.phone;
  user.shopEmail = user.shopRequest.email || user.email;
  user.businessLicense = user.shopRequest.businessLicense || user.businessLicense;
  user.rating = user.rating || 0;
  user.totalReviews = user.totalReviews || 0;
  await user.save();

    req.flash('success', 'Đã duyệt yêu cầu và cấp quyền Chủ shop cho người dùng');
    res.redirect('/admin/shops');
  } catch (error) {
    console.error('Approve shop error:', error);
    req.flash('error', 'Có lỗi xảy ra');
    res.redirect('/admin/shops');
  }
};

exports.rejectShop = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.shopRequested || !user.shopRequest) {
      req.flash('error', 'Yêu cầu shop không tồn tại');
      return res.redirect('/admin/shops');
    }

    user.shopRequest.status = 'rejected';
    user.shopRequested = false;
    await user.save();

    req.flash('success', 'Đã từ chối yêu cầu Chủ shop');
    res.redirect('/admin/shops');
  } catch (error) {
    console.error('Reject shop error:', error);
    req.flash('error', 'Có lỗi xảy ra');
    res.redirect('/admin/shops');
  }
};

exports.manageServices = async (req, res) => {
  try {
    const { category, status, search } = req.query;
    let query = {};

    if (category) query.category = category;
    if (status !== undefined) query.status = status === 'active' ? 'active' : 'inactive';
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const services = await Service.find(query)
      .populate('shop', 'shopName')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(100);

  // Load categories from DB
  const Category = require('../models/Category');
  const categories = await Category.find().sort({ name: 1 });

    res.render("admin/services", {
      title: "Dịch vụ",
      services,
      categories,
      currentCategory: category,
      currentStatus: status,
      currentSearch: search
    });
  } catch (error) {
    console.error('Manage services error:', error);
    req.flash('error', 'Có lỗi xảy ra khi tải danh sách dịch vụ');
    res.render("admin/services", {
      title: "Dịch vụ",
      services: [],
      categories: [],
      currentCategory: '',
      currentStatus: '',
      currentSearch: ''
    });
  }
};

exports.toggleServiceStatus = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      req.flash('error', 'Dịch vụ không tồn tại');
      return res.redirect('/admin/services');
    }

  service.status = service.status === 'active' ? 'inactive' : 'active';
  await service.save();

  req.flash('success', `Đã ${service.status === 'active' ? 'kích hoạt' : 'vô hiệu hóa'} dịch vụ`);
    res.redirect('/admin/services');
  } catch (error) {
    console.error('Toggle service status error:', error);
    req.flash('error', 'Có lỗi xảy ra');
    res.redirect('/admin/services');
  }
};

exports.manageOrders = async (req, res) => {
  try {
    const { status, paymentStatus, search } = req.query;
    let query = {};

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (search) {
      query.$or = [
        { _id: { $regex: search, $options: 'i' } },
        { 'customer.fullName': { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await Order.find(query)
      .populate('customer', 'fullName email phone')
      .populate('shop', 'shopName')
    .populate('services.service', 'title')
      .sort({ createdAt: -1 })
      .limit(100);

    res.render("admin/orders", {
      title: "Đơn thuê",
      orders,
      currentStatus: status,
      currentPaymentStatus: paymentStatus,
      currentSearch: search
    });
  } catch (error) {
    console.error('Manage orders error:', error);
    req.flash('error', 'Có lỗi xảy ra khi tải danh sách đơn hàng');
    res.render("admin/orders", {
      title: "Đơn thuê",
      orders: [],
      currentStatus: '',
      currentPaymentStatus: '',
      currentSearch: ''
    });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      req.flash('error', 'Đơn hàng không tồn tại');
      return res.redirect('/admin/orders');
    }

    order.status = status;
    await order.save();

    req.flash('success', 'Đã cập nhật trạng thái đơn hàng');
    res.redirect('/admin/orders');
  } catch (error) {
    console.error('Update order status error:', error);
    req.flash('error', 'Có lỗi xảy ra');
    res.redirect('/admin/orders');
  }
};

exports.manageReviews = async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};

    if (status === 'reported') query.isReported = true;
    if (status === 'hidden') query.isVisible = false;
    if (search) {
      query.$or = [
        { comment: { $regex: search, $options: 'i' } },
        { 'customer.fullName': { $regex: search, $options: 'i' } }
      ];
    }

    const reviews = await Review.find(query)
      .populate('customer', 'fullName')
      .populate('service', 'name')
      .populate('shop', 'shopName')
      .sort({ createdAt: -1 })
      .limit(100);

    res.render("admin/reviews", {
      title: "Đánh giá",
      reviews,
      currentStatus: status,
      currentSearch: search
    });
  } catch (error) {
    console.error('Manage reviews error:', error);
    req.flash('error', 'Có lỗi xảy ra khi tải danh sách đánh giá');
    res.render("admin/reviews", {
      title: "Đánh giá",
      reviews: [],
      currentStatus: '',
      currentSearch: ''
    });
  }
};

exports.toggleReviewVisibility = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      req.flash('error', 'Đánh giá không tồn tại');
      return res.redirect('/admin/reviews');
    }

    review.isVisible = !review.isVisible;
    await review.save();

    req.flash('success', `Đã ${review.isVisible ? 'hiển thị' : 'ẩn'} đánh giá`);
    res.redirect('/admin/reviews');
  } catch (error) {
    console.error('Toggle review visibility error:', error);
    req.flash('error', 'Có lỗi xảy ra');
    res.redirect('/admin/reviews');
  }
};

exports.reports = async (req, res) => {
  try {
    // Tổng doanh thu
    const paidOrders = await Order.find({ paymentStatus: 'paid' });
    const totalRevenue = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    // Dịch vụ phổ biến nhất
    const serviceStats = await Service.aggregate([
      { $lookup: { from: 'orders', localField: '_id', foreignField: 'services.service', as: 'orders' } },
      { $project: { name: 1, orderCount: { $size: '$orders' } } },
      { $sort: { orderCount: -1 } },
      { $limit: 5 }
    ]);

    // Thống kê shop (theo user.role === 'shop' và dựa trên services -> orders)
    const shopStats = await Service.aggregate([
      { $group: { _id: '$shop', serviceCount: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'shopUser' } },
      { $unwind: { path: '$shopUser', preserveNullAndEmptyArrays: true } },
      { $project: { shopName: '$shopUser.fullName', orderCount: '$serviceCount' } },
      { $sort: { orderCount: -1 } },
      { $limit: 5 }
    ]);

    // Người dùng mới trong tháng
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const newUsers = await User.countDocuments({ createdAt: { $gte: thisMonth } });

    // Người dùng quay lại
    const returningUsers = await User.countDocuments({
      createdAt: { $lt: thisMonth },
      $expr: { $gt: [{ $size: { $ifNull: ['$orders', []] } }, 0] }
    });

    res.render("admin/reports", {
      title: "Báo cáo",
      totalRevenue,
      topService: serviceStats[0]?.name || 'N/A',
      newUsers,
      returningUsers,
      shopRevenueLabels: shopStats.map(s => s.shopName),
      shopRevenueData: shopStats.map(s => s.orderCount),
      serviceLabels: serviceStats.map(s => s.name),
      serviceData: serviceStats.map(s => s.orderCount)
    });
  } catch (error) {
    console.error('Reports error:', error);
    req.flash('error', 'Có lỗi xảy ra khi tải báo cáo');
    res.render("admin/reports", {
      title: "Báo cáo",
      totalRevenue: 0,
      topService: 'N/A',
      newUsers: 0,
      returningUsers: 0,
      shopRevenueLabels: [],
      shopRevenueData: [],
      serviceLabels: [],
      serviceData: []
    });
  }
};
