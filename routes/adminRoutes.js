const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { requireAdmin } = require("../middleware/auth");

// Dashboard
router.get("/dashboard", requireAdmin, adminController.dashboard);

// Quản lý người dùng
router.get("/users", requireAdmin, adminController.manageUsers);
router.post("/users/:id/toggle-status", requireAdmin, adminController.toggleUserStatus);

// Quản lý shop
router.get("/shops", requireAdmin, adminController.manageShops);
router.post("/shops/:id/approve", requireAdmin, adminController.approveShop);
router.post("/shops/:id/reject", requireAdmin, adminController.rejectShop);

// Quản lý dịch vụ
router.get("/services", requireAdmin, adminController.manageServices);
router.post("/services/:id/toggle-status", requireAdmin, adminController.toggleServiceStatus);

// Quản lý đơn thuê
router.get("/orders", requireAdmin, adminController.manageOrders);
router.post("/orders/:id/update-status", requireAdmin, adminController.updateOrderStatus);

// Quản lý đánh giá
router.get("/reviews", requireAdmin, adminController.manageReviews);
router.post("/reviews/:id/toggle-visibility", requireAdmin, adminController.toggleReviewVisibility);

// Báo cáo
router.get("/reports", requireAdmin, adminController.reports);

module.exports = router;
