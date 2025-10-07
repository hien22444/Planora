const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/CategoryController');

// Danh sách
router.get('/', CategoryController.list);

// Thêm mới
router.get('/add', CategoryController.renderAddForm); 
router.post('/add', CategoryController.add);

// Chỉnh sửa
router.get('/edit/:id', CategoryController.editForm);
router.post('/edit/:id', CategoryController.update);

// Xóa
router.post('/delete/:id', CategoryController.delete);

module.exports = router;
