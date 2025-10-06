const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { isShop } = require('../controllers/ServiceController'); // middleware kiểm tra shop

// Xem đơn hàng theo service
router.get('/', isShop, async (req, res) => {
  try {
    const { service } = req.query;
    const query = { shop: req.user._id }; // chỉ lấy đơn hàng của shop này

    if (service) {
      query['services.service'] = service;
    }

    // Lấy tất cả order, bao gồm pending và completed
    const orders = await Order.find(query)
      .populate('services.service')
      .sort({ createdAt: -1 })
      .lean();

    res.render('orders/ordersByService', { orders, serviceId: service, user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
