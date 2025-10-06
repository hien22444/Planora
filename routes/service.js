const express = require('express');
const router = express.Router();
const { ServiceController, isShop } = require('../controllers/ServiceController');

// Route tạo service (chỉ shop)
router.get('/add', isShop, ServiceController.createForm);
router.post('/add', isShop, ServiceController.create);

// Route chỉnh sửa (chỉ shop)
router.get('/edit/:id', isShop, ServiceController.editForm);
router.post('/edit/:id', isShop, ServiceController.update);

// Xóa service (chỉ shop)
router.post('/delete/:id', isShop, ServiceController.delete);

// ⚠️ Đưa sales lên trước /:id
router.get('/sales', isShop, ServiceController.getTotalSales);
router.get('/sales/:id', isShop, ServiceController.getServiceSales);

// Xem chi tiết
router.get('/:id', ServiceController.show);

// Danh sách service
router.get('/', ServiceController.services);

module.exports = router;
