const Category = require('../models/Category');

// Middleware kiểm tra shop
const isShop = (req, res, next) => {
    const user = req.user || (req.session && req.session.user);
    if (user && user.role === 'shop') return next();
    return res.status(403).send('Access denied');
};

const CategoryController = {

    // Danh sách category
    list: async (req, res) => {
    const categories = await Category.find();
    res.render('categories/categories', { categories, user: req.user });
    },

    // Form thêm mới
    addForm: isShop, // middleware trước khi hiển thị form
    renderAddForm: (req, res) => {
        res.render('categories/addCategory', { user: req.user });
    },

    // Thêm mới
    add: [isShop, async (req, res) => {
        const { name } = req.body;
        if (!name) return res.send('Category name is required');
        await Category.create({ name });
        res.redirect('/categories');
    }],

    // Form chỉnh sửa
    editForm: [isShop, async (req, res) => {
        const category = await Category.findById(req.params.id);
    res.render('categories/editCategory', { category, user: req.user });
    }],

    // Cập nhật
    update: [isShop, async (req, res) => {
        const { name } = req.body;
        await Category.findByIdAndUpdate(req.params.id, { name });
        res.redirect('/categories');
    }],

    // Xóa
    delete: [isShop, async (req, res) => {
        await Category.findByIdAndDelete(req.params.id);
        res.redirect('/categories');
    }],
};

module.exports = CategoryController;
