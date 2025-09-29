exports.dashboard = (req, res) => {
  res.render("admin/dashboard", {
    title: "Dashboard",
    userCount: 2500,
    shopCount: 1805,
    serviceCount: 3200,
    orderCount: 5400,
    revenueLabels: ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6"],
    revenueData: [120, 150, 180, 200, 170, 210],
    orderLabels: ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6"],
    orderData: [30, 45, 50, 60, 55, 70],
    alerts: [
      "Shop ABC bị báo cáo vi phạm.",
      "Dịch vụ XYZ bị báo cáo chất lượng kém.",
      "Đơn thuê DH001 có dấu hiệu bất thường.",
    ],
  });
};

exports.manageUsers = (req, res) => {
  res.render("admin/users", {
    title: "Người dùng",
  });
};

exports.manageShops = (req, res) => {
  res.render("admin/shops", {
    title: "Shop",
  });
};

exports.manageServices = (req, res) => {
  res.render("admin/services", {
    title: "Dịch vụ",
  });
};

exports.manageOrders = (req, res) => {
  res.render("admin/orders", {
    title: "Đơn thuê",
  });
};

exports.reports = (req, res) => {
  res.render("admin/reports", {
    title: "Báo cáo",
    totalRevenue: 22500000,
    topService: "Dịch vụ 1",
    newUsers: 120,
    returningUsers: 45,
    shopRevenueLabels: ["Shop ABC", "Shop XYZ", "Shop QWE"],
    shopRevenueData: [12000000, 8500000, 2500000],
    serviceLabels: ["Dịch vụ 1", "Dịch vụ 2", "Dịch vụ 3"],
    serviceData: [80, 45, 30],
  });
};
