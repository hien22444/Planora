const Service = require('../models/Service');
const Category = require('../models/Category');
const Order = require('../models/Order');

// Middleware kiểm tra shop
const isShop = (req, res, next) => {
    const user = req.user || req.session.user;
    if (user && user.role === 'shop') return next();
    return res.status(403).send('Access denied');
};

const ServiceController = {

    // Danh sách service
    services: async (req, res) => {
        try {
            const query = {};
            if (req.user && req.user.role === 'shop') {
                query.shop = req.user._id;
            }
            const services = await Service.find(query)
                .populate('shop')
                .populate('category')
                .sort({ createdAt: -1 });
            res.render('services/services', { services, user: req.user });
        } catch (err) {
            console.error('Error loading services:', err);
            res.status(500).send('Server error');
        }
    },

    // Xem chi tiết service
    show: async (req, res) => {
        try {
            const service = await Service.findById(req.params.id)
                .populate('shop')
                .populate('category');
            if (!service) return res.status(404).send('Service not found');

            if (req.user && req.user.role === 'shop') {
                if (!service.shop || service.shop.toString() !== req.user._id.toString()) {
                    req.flash && req.flash('error', 'Bạn không có quyền xem dịch vụ này');
                    return res.redirect('/services');
                }
            }

            res.render('services/show', { service, user: req.user });
        } catch (err) {
            console.error('Error showing service:', err);
            res.status(500).send('Server error');
        }
    },

    // Form tạo service
    createForm: async (req, res) => {
        const categories = await Category.find();
        res.render('services/addService', { user: req.user, categories });
    },

    // Xử lý tạo service (hỗ trợ nhiều ảnh + video)
    create: async (req, res) => {
        try {
            const { title, description, price, address, status, category } = req.body;

            // Lấy ảnh/video từ req.files nếu dùng multer. Hỗ trợ fallback từ trường text 'image' hoặc 'images' trong body
            let images = ['/images/default-service.jpg'];
            if (req.files && req.files['images'] && req.files['images'].length) {
                images = req.files['images'].map(file => {
                    // convert filesystem absolute path to web path by stripping everything before 'public/'
                    let fp = file.path.replace(/\\/g, '/');
                    const idx = fp.indexOf('/public/');
                    let webPath = fp;
                    if (idx !== -1) webPath = fp.substring(idx + 7); // remove '/public'
                    if (!webPath.startsWith('/')) webPath = '/' + webPath;
                    return webPath;
                });
            } else if (req.body.image) {
                // single image URL provided via text input
                images = [req.body.image.trim()];
            } else if (req.body.images) {
                // comma-separated URLs
                images = req.body.images.split(',').map(s => s.trim()).filter(Boolean);
            }

            const video = (req.files && req.files['video'] && req.files['video'][0])
                ? (() => {
                    let fp = req.files['video'][0].path.replace(/\\/g, '/');
                    const idx = fp.indexOf('/public/');
                    let p = fp;
                    if (idx !== -1) p = fp.substring(idx + 7);
                    if (!p.startsWith('/')) p = '/' + p;
                    return p;
                })()
                : (req.body.video || '');

            await Service.create({
                title,
                description,
                price,
                address,
                images,
                video,
                status: status || 'active',
                shop: req.user ? req.user._id : req.session.userId,
                category,
                soldCount: 0 // mặc định chưa bán
            });

            res.redirect('/services');
        } catch (err) {
            console.error(err);
            res.status(500).send('Server error');
        }
    },

    // Form chỉnh sửa service
    editForm: async (req, res) => {
        try {
            const service = await Service.findById(req.params.id);
            const categories = await Category.find();
            if (!service) return res.status(404).send('Service not found');

            if (req.user && req.user.role === 'shop') {
                if (!service.shop || service.shop.toString() !== req.user._id.toString()) {
                    req.flash && req.flash('error', 'Bạn không có quyền chỉnh sửa dịch vụ này');
                    return res.redirect('/services');
                }
            }

            res.render('services/editService', { service, user: req.user, categories });
        } catch (err) {
            console.error('Error loading edit form:', err);
            res.status(500).send('Server error');
        }
    },

    // Xử lý update service (có thể update nhiều ảnh/video)
    update: async (req, res) => {
        try {
            const { title, description, price, address, status, category } = req.body;

            const service = await Service.findById(req.params.id);
            if (!service) return res.status(404).send('Service not found');

            if (req.user && req.user.role === 'shop') {
                if (!service.shop || service.shop.toString() !== req.user._id.toString()) {
                    req.flash && req.flash('error', 'Bạn không có quyền cập nhật dịch vụ này');
                    return res.redirect('/services');
                }
            }

            // Nếu upload ảnh mới, cập nhật, nếu không giữ ảnh cũ
            if (req.files && req.files['images'] && req.files['images'].length) {
                service.images = req.files['images'].map(file => {
                    let fp = file.path.replace(/\\/g, '/');
                    const idx = fp.indexOf('/public/');
                    let webPath = fp;
                    if (idx !== -1) webPath = fp.substring(idx + 7);
                    if (!webPath.startsWith('/')) webPath = '/' + webPath;
                    return webPath;
                });
            } else if (req.body.image) {
                service.images = [req.body.image.trim()];
            } else if (req.body.images) {
                service.images = req.body.images.split(',').map(s => s.trim()).filter(Boolean);
            }

            // Nếu upload video mới
            if (req.files && req.files['video'] && req.files['video'][0]) {
                let fp = req.files['video'][0].path.replace(/\\/g, '/');
                const idx = fp.indexOf('/public/');
                let vp = fp;
                if (idx !== -1) vp = fp.substring(idx + 7);
                if (!vp.startsWith('/')) vp = '/' + vp;
                service.video = vp;
            }

            service.title = title;
            service.description = description;
            service.price = price;
            service.address = address;
            service.status = status || service.status;
            service.category = category;

            await service.save();

            res.redirect('/services');
        } catch (err) {
            console.error(err);
            res.status(500).send('Server error');
        }
    },

    // Xóa service
    delete: async (req, res) => {
        try {
            const service = await Service.findById(req.params.id);
            if (!service) return res.status(404).send('Service not found');

            if (req.user && req.user.role === 'shop') {
                if (!service.shop || service.shop.toString() !== req.user._id.toString()) {
                    req.flash && req.flash('error', 'Bạn không có quyền xoá dịch vụ này');
                    return res.redirect('/services');
                }
            }

            await Service.findByIdAndDelete(req.params.id);
            res.redirect('/services');
        } catch (err) {
            console.error(err);
            res.status(500).send('Server error');
        }
    },
    // 📊 Tổng doanh số của tất cả dịch vụ
getTotalSales: async (req, res) => {
  try {
    const Order = require('../models/Order');
    const Service = require('../models/Service');

    // Lọc theo shop nếu có
    const query = {};
    if (req.user && req.user.role === 'shop') {
      query.shop = req.user._id;
    }

    // Lấy danh sách order đã hoàn thành
    const orders = await Order.find({ status: 'completed', ...query })
      .populate('services.service')
      .exec();

    // --- Tính doanh thu theo dịch vụ ---
    const serviceMap = {};
    orders.forEach(order => {
      order.services.forEach(item => {
        const s = item.service;
        if (!serviceMap[s._id]) {
          serviceMap[s._id] = {
            title: s.title,
            price: item.price,
            sold: 0,
            revenue: 0,
            orderCreatedAt: order.createdAt, // lưu ngày tạo order đầu tiên
          };
        }
        serviceMap[s._id].sold += item.quantity;
        serviceMap[s._id].revenue += item.price * item.quantity;
      });
    });

    const services = Object.values(serviceMap);
    const totalSold = services.reduce((sum, s) => sum + s.sold, 0);
    const totalRevenue = services.reduce((sum, s) => sum + s.revenue, 0);

    // --- Tính doanh thu theo tháng ---
    const monthlyMap = {};
    orders.forEach(order => {
      const month = order.createdAt.getMonth() + 1; // 1–12
      const year = order.createdAt.getFullYear();
      const key = `${month}/${year}`;
      if (!monthlyMap[key]) monthlyMap[key] = 0;
      monthlyMap[key] += order.totalAmount;
    });

    const monthlyData = Object.keys(monthlyMap).map(m => ({
      month: m,
      revenue: monthlyMap[m],
    }));

    // --- Gửi dữ liệu sang EJS ---
    res.render('services/totalSales', {
      totalSold,
      totalRevenue,
      services,
      monthlyData,
      orders,
      user: req.user,
    });
  } catch (err) {
    console.error('Error calculating total sales:', err);
    res.status(500).send('Server error: ' + err.message);
  }
},

    // 💰 Doanh số của một dịch vụ cụ thể
    getServiceSales: async (req, res) => {
        try {
            const service = await Service.findById(req.params.id).populate('shop');
            if (!service) return res.status(404).send('Service not found');

            // Chỉ lấy đơn hàng hoàn thành có chứa service này
            const orders = await Order.find({
                status: 'completed',
                'services.service': service._id
            }).lean();

            // Tính tổng doanh thu và số lượng bán cho service này
            let totalSold = 0;
            let totalRevenue = 0;
            const salesData = [];

            orders.forEach(order => {
                const matchedService = order.services.find(
                    s => s.service.toString() === service._id.toString()
                );
                if (matchedService) {
                    totalSold += matchedService.quantity;
                    totalRevenue += matchedService.quantity * matchedService.price;

                    salesData.push({
                        orderId: order._id,
                        date: new Date(order.createdAt).toLocaleDateString('vi-VN'),
                        quantity: matchedService.quantity,
                        revenue: matchedService.quantity * matchedService.price
                    });
                }
            });

            // Thống kê doanh thu theo tháng cho service cụ thể
            const monthlyRevenue = {};
            orders.forEach(order => {
                const matchedService = order.services.find(
                    s => s.service.toString() === service._id.toString()
                );
                if (matchedService) {
                    const date = new Date(order.createdAt);
                    const month = date.getMonth() + 1;
                    const year = date.getFullYear();
                    const key = `${month}/${year}`;

                    if (!monthlyRevenue[key]) monthlyRevenue[key] = 0;
                    monthlyRevenue[key] += matchedService.quantity * matchedService.price;
                }
            });

            const monthlyRevenueArray = Object.entries(monthlyRevenue).map(([key, revenue]) => {
                const [month, year] = key.split('/');
                return { month, year, revenue };
            });

            res.render('services/serviceSales', {
                service,
                totalSold,
                totalRevenue,
                salesData,
                monthlyRevenue: monthlyRevenueArray,
                user: req.user
            });
        } catch (err) {
            console.error('Error loading service sales:', err);
            res.status(500).send('Server error');
        }
    }
};

module.exports = { ServiceController, isShop };
