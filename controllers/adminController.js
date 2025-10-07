// Hiển thị thông tin chi tiết người dùng
exports.showUserDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      req.flash && req.flash("error", "Người dùng không tồn tại");
      return res.render("admin/userDetail", {
        layout: "layouts/admin",
        title: "Chi tiết người dùng",
        user: null,
      });
    }
    res.render("admin/userDetail", {
      layout: "layouts/admin",
      title: "Chi tiết người dùng",
      user,
    });
  } catch (error) {
    console.error("showUserDetail error:", error);
    res.render("admin/userDetail", {
      title: "Chi tiết người dùng",
      user: null,
    });
  }
};
const User = require("../models/User");
// Shop model removed — shop is represented by User.role and User.shopRequest
const Service = require("../models/Service");
const Order = require("../models/Order");
const Review = require("../models/Review");

exports.dashboard = async (req, res) => {
  try {
    // Thống kê tổng quan
    const userCount = await User.countDocuments();
    // Count shops as users with role 'shop'
    const shopCount = await User.countDocuments({ role: "shop" });
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
        paymentStatus: "paid",
      });

      const revenue = monthOrders.reduce(
        (sum, order) => sum + order.totalAmount,
        0
      );
      revenueData.push(revenue);
      orderData.push(monthOrders.length);
      labels.push(`Th${6 - i}`);
    }

    // KPIs: doanh thu hôm nay/tháng, đơn chờ xử lý, chờ thanh toán
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );

    const todayPaidOrders = await Order.find({
      paymentStatus: "paid",
      createdAt: { $gte: startOfToday },
    });
    const monthPaidOrders = await Order.find({
      paymentStatus: "paid",
      createdAt: { $gte: startOfMonth },
    });
    const revenueToday = todayPaidOrders.reduce(
      (s, o) => s + (o.totalAmount || 0),
      0
    );
    const revenueMonth = monthPaidOrders.reduce(
      (s, o) => s + (o.totalAmount || 0),
      0
    );
    const pendingOrders = await Order.countDocuments({ status: "pending" });
    const unpaidOrders = await Order.countDocuments({
      paymentStatus: "pending",
    });

    // Cảnh báo
    const pendingShops = await User.countDocuments({
      shopRequested: true,
      "shopRequest.status": "pending",
    });
    const reportedReviews = await Review.countDocuments({ isReported: true });
    const alerts = [];

    if (pendingShops > 0) {
      alerts.push(`${pendingShops} shop đang chờ duyệt`);
    }
    if (reportedReviews > 0) {
      alerts.push(`${reportedReviews} đánh giá bị báo cáo`);
    }

    // Dữ liệu cho các khối dashboard
    const recentOrders = await Order.find({})
      .populate("customer", "fullName email")
      .populate("shop", "shopName")
      .populate("services.service", "title")
      .sort({ createdAt: -1 })
      .limit(5);

    const topServicesAgg = await Order.aggregate([
      { $unwind: "$services" },
      {
        $group: {
          _id: "$services.service",
          totalOrders: { $sum: "$services.quantity" },
        },
      },
      { $sort: { totalOrders: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "services",
          localField: "_id",
          foreignField: "_id",
          as: "service",
        },
      },
      { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
      { $project: { title: "$service.title", totalOrders: 1 } },
    ]);

    const topServices = topServicesAgg.map((s) => ({
      title: s.title || "N/A",
      totalOrders: s.totalOrders || 0,
    }));

    const recentUsers = await User.find({}).sort({ createdAt: -1 }).limit(5);

    const latestReviews = await Review.find({})
      .populate("customer", "fullName")
      .sort({ createdAt: -1 })
      .limit(5);

    res.render("admin/dashboard", {
      layout: "layouts/admin",
      title: "Dashboard",
      path: "/admin/dashboard",
      userCount,
      shopCount,
      serviceCount,
      orderCount,
      revenueToday,
      revenueMonth,
      pendingOrders,
      unpaidOrders,
      revenueLabels: labels,
      revenueData,
      orderLabels: labels,
      orderData,
      alerts,
      recentOrders,
      topServices,
      recentUsers,
      latestReviews,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    req.flash("error", "Có lỗi xảy ra khi tải dashboard");
    res.render("admin/dashboard", {
      layout: "layouts/admin",
      title: "Dashboard",
      userCount: 0,
      shopCount: 0,
      serviceCount: 0,
      orderCount: 0,
      revenueLabels: [],
      revenueData: [],
      orderLabels: [],
      orderData: [],
      alerts: [],
    });
  }
};

exports.manageUsers = async (req, res) => {
  const { role = "", status = "", search = "" } = req.query;
  let totalUsers = 0;
  let totalShops = 0;
  let users = [];
  try {
    let query = {};
    if (role) query.role = role;
    if (status) query.isActive = status === "active";
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    users = await User.find(query).sort({ createdAt: -1 });
    totalUsers = await User.countDocuments();
    totalShops = await User.countDocuments({ role: "shop" });
  } catch (error) {
    console.error("manageUsers error:", error);
    // Keep default values (0, [])
  }
  res.render("admin/users", {
    layout: "layouts/admin",
    title: "Người dùng",
    path: "/admin/users",
    totalUsers,
    totalShops,
    users,
    role,
    status,
    search,
  });
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      req.flash("error", "Người dùng không tồn tại");
      return res.redirect("/admin/users");
    }

    user.isActive = !user.isActive;
    await user.save();

    req.flash(
      "success",
      `Đã ${user.isActive ? "kích hoạt" : "khóa"} tài khoản`
    );
    res.redirect("/admin/users");
  } catch (error) {
    console.error("Toggle user status error:", error);
    req.flash("error", "Có lỗi xảy ra");
    res.redirect("/admin/users");
  }
};

exports.manageShops = async (req, res) => {
  try {
    const { status, search } = req.query;
    let query;

    if (status) {
      // filter by status on shopRequest
      query = { "shopRequest.status": status };
    } else {
      // show approved shops and pending requests
      query = { $or: [{ role: "shop" }, { shopRequested: true }] };
    }
    if (search) {
      query.$or = [
        { "shopRequest.shopName": { $regex: search, $options: "i" } },
        { "shopRequest.email": { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
      ];
    }

    const shops = await User.find(query)
      .select("fullName email phone shopRequest role shopRequested createdAt")
      .sort({ "shopRequest.requestedAt": -1 });

    res.render("admin/shops", {
      layout: "layouts/admin",
      title: "Shop",
      path: "/admin/shops",
      shops,
      currentStatus: status,
      currentSearch: search,
    });
  } catch (error) {
    console.error("Manage shops error:", error);
    req.flash("error", "Có lỗi xảy ra khi tải danh sách shop");
    res.render("admin/shops", {
      layout: "layouts/admin",
      title: "Shop",
      shops: [],
      currentStatus: "",
      currentSearch: "",
    });
  }
};

exports.approveShop = async (req, res) => {
  try {
    // req.params.id is user id (we changed admin routes to pass user id)
    const user = await User.findById(req.params.id);
    if (!user || !user.shopRequested || !user.shopRequest) {
      req.flash("error", "Yêu cầu shop không tồn tại");
      return res.redirect("/admin/shops");
    }

    user.shopRequest.status = "approved";
    user.shopRequested = false; // clear request flag
    user.role = "shop";
    // copy request data into shop profile fields for easy population
    user.shopName = user.shopRequest.shopName;
    user.shopAddress = user.shopRequest.address;
    user.shopPhone = user.shopRequest.phone || user.phone;
    user.shopEmail = user.shopRequest.email || user.email;
    user.businessLicense =
      user.shopRequest.businessLicense || user.businessLicense;
    user.rating = user.rating || 0;
    user.totalReviews = user.totalReviews || 0;
    await user.save();

    req.flash(
      "success",
      "Đã duyệt yêu cầu và cấp quyền Chủ shop cho người dùng"
    );
    res.redirect("/admin/shops");
  } catch (error) {
    console.error("Approve shop error:", error);
    req.flash("error", "Có lỗi xảy ra");
    res.redirect("/admin/shops");
  }
};

exports.rejectShop = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.shopRequested || !user.shopRequest) {
      req.flash("error", "Yêu cầu shop không tồn tại");
      return res.redirect("/admin/shops");
    }

    user.shopRequest.status = "rejected";
    user.shopRequested = false;
    await user.save();

    req.flash("success", "Đã từ chối yêu cầu Chủ shop");
    res.redirect("/admin/shops");
  } catch (error) {
    console.error("Reject shop error:", error);
    req.flash("error", "Có lỗi xảy ra");
    res.redirect("/admin/shops");
  }
};

exports.manageServices = async (req, res) => {
  // TODO: Implement manageServices logic or use demo data
  res.render("admin/services", {
    layout: "layouts/admin",
    title: "Dịch vụ",
    path: "/admin/services",
    services: [],
    categories: [],
    currentCategory: "",
    currentStatus: "",
    currentSearch: "",
  });
};

exports.toggleServiceStatus = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      req.flash("error", "Dịch vụ không tồn tại");
      return res.redirect("/admin/services");
    }

    service.status = service.status === "active" ? "inactive" : "active";
    await service.save();

    req.flash(
      "success",
      `Đã ${service.status === "active" ? "kích hoạt" : "vô hiệu hóa"} dịch vụ`
    );
    res.redirect("/admin/services");
  } catch (error) {
    console.error("Toggle service status error:", error);
    req.flash("error", "Có lỗi xảy ra");
    res.redirect("/admin/services");
  }
};

exports.manageOrders = async (req, res) => {
  try {
    const { status, paymentStatus, search } = req.query;
    let query = {};

    // Xây dựng query dựa trên các điều kiện lọc
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (search) {
      query.$or = [
        { _id: { $regex: search, $options: "i" } },
        { "customer.fullName": { $regex: search, $options: "i" } },
        { "shop.shopName": { $regex: search, $options: "i" } },
      ];
    }

    const orders = await Order.find(query)
      .populate({
        path: "customer",
        select: "fullName email phone",
      })
      .populate({
        path: "shop",
        select: "shopName email phone",
      })
      .populate({
        path: "services.service",
        select: "title price",
      })
      .sort({ createdAt: -1 })
      .limit(100);

    res.render("admin/orders", {
      layout: "layouts/admin",
      title: "Đơn thuê",
      path: "/admin/orders",
      orders,
      currentStatus: status,
      currentPaymentStatus: paymentStatus,
      currentSearch: search,
    });
  } catch (error) {
    console.error("Manage orders error:", error);
    req.flash("error", "Có lỗi xảy ra khi tải danh sách đơn hàng");
    res.render("admin/orders", {
      layout: "layouts/admin",
      title: "Đơn thuê",
      orders: [],
      currentStatus: "",
      currentPaymentStatus: "",
      currentSearch: "",
    });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      req.flash("error", "Đơn hàng không tồn tại");
      return res.redirect("/admin/orders");
    }

    order.status = status;
    await order.save();

    req.flash("success", "Đã cập nhật trạng thái đơn hàng");
    res.redirect("/admin/orders");
  } catch (error) {
    console.error("Update order status error:", error);
    req.flash("error", "Có lỗi xảy ra");
    res.redirect("/admin/orders");
  }
};

exports.manageReviews = async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};

    if (status === "reported") query.isReported = true;
    if (status === "hidden") query.isVisible = false;
    if (search) {
      query.$or = [
        { comment: { $regex: search, $options: "i" } },
        { "customer.fullName": { $regex: search, $options: "i" } },
      ];
    }

    const reviews = await Review.find(query)
      .populate("customer", "fullName")
      .populate("service", "name")
      .populate("shop", "shopName")
      .sort({ createdAt: -1 })
      .limit(100);

    res.render("admin/reviews", {
      layout: "layouts/admin",
      title: "Đánh giá",
      path: "/admin/reviews",
      reviews,
      currentStatus: status,
      currentSearch: search,
    });
  } catch (error) {
    console.error("Manage reviews error:", error);
    req.flash("error", "Có lỗi xảy ra khi tải danh sách đánh giá");
    res.render("admin/reviews", {
      layout: "layouts/admin",
      title: "Đánh giá",
      reviews: [],
      currentStatus: "",
      currentSearch: "",
    });
  }
};

exports.toggleReviewVisibility = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      req.flash("error", "Đánh giá không tồn tại");
      return res.redirect("/admin/reviews");
    }

    review.isVisible = !review.isVisible;
    await review.save();

    req.flash("success", `Đã ${review.isVisible ? "hiển thị" : "ẩn"} đánh giá`);
    res.redirect("/admin/reviews");
  } catch (error) {
    console.error("Toggle review visibility error:", error);
    req.flash("error", "Có lỗi xảy ra");
    res.redirect("/admin/reviews");
  }
};

exports.reports = async (req, res) => {
  try {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Doanh thu theo thời gian (6 tháng gần nhất)
    const revenueStats = await Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 6 },
    ]);

    // Format dữ liệu cho biểu đồ doanh thu
    const revenueChartData = {
      labels: revenueStats
        .map((stat) => `${stat._id.month}/${stat._id.year}`)
        .reverse(),
      data: revenueStats.map((stat) => stat.total).reverse(),
      orderCounts: revenueStats.map((stat) => stat.count).reverse(),
    };

    // Top 5 shop có doanh thu cao nhất
    const topShops = await Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      {
        $group: {
          _id: "$shop",
          totalRevenue: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "shopInfo",
        },
      },
      { $unwind: "$shopInfo" },
      {
        $project: {
          shopName: "$shopInfo.shopName",
          totalRevenue: 1,
          orderCount: 1,
          averageOrder: { $divide: ["$totalRevenue", "$orderCount"] },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
    ]);

    // Top 5 dịch vụ được thuê nhiều nhất
    const topServices = await Order.aggregate([
      { $unwind: "$services" },
      {
        $group: {
          _id: "$services.service",
          totalQuantity: { $sum: "$services.quantity" },
          totalRevenue: {
            $sum: { $multiply: ["$services.price", "$services.quantity"] },
          },
        },
      },
      {
        $lookup: {
          from: "services",
          localField: "_id",
          foreignField: "_id",
          as: "serviceInfo",
        },
      },
      { $unwind: "$serviceInfo" },
      {
        $project: {
          serviceName: "$serviceInfo.title",
          totalQuantity: 1,
          totalRevenue: 1,
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
    ]);

    // Thống kê theo trạng thái đơn hàng
    const orderStatusStats = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0],
            },
          },
        },
      },
    ]);

    // Thống kê người dùng
    const userStats = await User.aggregate([
      {
        $facet: {
          newUsers: [
            { $match: { createdAt: { $gte: thisMonth } } },
            { $count: "count" },
          ],
          totalUsers: [{ $count: "count" }],
          activeUsers: [
            {
              $match: {
                lastLoginAt: { $gte: thisMonth },
              },
            },
            { $count: "count" },
          ],
          roleDistribution: [
            {
              $group: {
                _id: "$role",
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    // Extract user statistics
    const userMetrics = {
      newUsers: userStats[0].newUsers[0]?.count || 0,
      totalUsers: userStats[0].totalUsers[0]?.count || 0,
      activeUsers: userStats[0].activeUsers[0]?.count || 0,
      roleDistribution: userStats[0].roleDistribution || [],
    };

    // Doanh thu tháng này và so sánh
    const revenueComparison = {
      thisMonth: {
        total: revenueStats[0]?.total || 0,
        count: revenueStats[0]?.count || 0,
      },
      lastMonth: {
        total: revenueStats[1]?.total || 0,
        count: revenueStats[1]?.count || 0,
      },
    };

    res.render("admin/reports", {
      layout: "layouts/admin",
      title: "Báo cáo & Thống kê",
      path: "/admin/reports",
      revenueChartData,
      topShops,
      topServices,
      orderStatusStats,
      userMetrics,
      revenueComparison,
    });
  } catch (error) {
    console.error("Reports error:", error);
    req.flash("error", "Có lỗi xảy ra khi tải báo cáo");
    res.render("admin/reports", {
      layout: "layouts/admin",
      title: "Báo cáo",
      path: "/admin/reports",
      totalRevenue: 0,
      topService: "N/A",
      newUsers: 0,
      returningUsers: 0,
      shopRevenueLabels: [],
      shopRevenueData: [],
      serviceLabels: [],
      serviceData: [],
    });
  }
};
