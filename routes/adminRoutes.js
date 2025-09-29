const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

// Dashboard
router.get("/dashboard", adminController.dashboard);

// Quản lý người dùng
router.get("/users", adminController.manageUsers);

// Quản lý shop
router.get("/shops", adminController.manageShops);

// Quản lý dịch vụ
router.get("/services", adminController.manageServices);

// Quản lý đơn thuê
router.get("/orders", adminController.manageOrders);

// Báo cáo
router.get("/reports", adminController.reports);

module.exports = router;
