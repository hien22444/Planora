const mongoose = require('mongoose');
const Order = require('../models/Order');
const Service = require('../models/Service');

/**
 * Idempotently increment soldCount for services in an order.
 * Strategy:
 * 1. Try to atomically set order.countsApplied = true only when it is false using findOneAndUpdate.
 * 2. If that update modified a document (i.e., previous countsApplied was false), proceed to increment
 *    soldCount for each service using bulkWrite with $inc.
 * 3. This avoids double increments if called multiple times.
 *
 * Returns { success: true, applied: boolean }
 */
async function incrementSoldCountForOrder(orderId) {
  if (!orderId) throw new Error('orderId required');

  // Attempt to flip countsApplied from false -> true atomically
  const updated = await Order.findOneAndUpdate(
    { _id: orderId, countsApplied: { $ne: true } },
    { $set: { countsApplied: true } },
    { new: false }
  ).lean();

  // If updated is null, countsApplied was already true (or order not found)
  if (!updated) {
    // check existence
    const exists = await Order.exists({ _id: orderId });
    if (!exists) return { success: false, reason: 'order_not_found' };
    return { success: true, applied: false }; // already applied earlier
  }

  // At this point, we flipped countsApplied to true (or at least reserved it) and should increment sold counts
  const order = await Order.findById(orderId).lean();
  if (!order || !Array.isArray(order.services) || order.services.length === 0) {
    return { success: true, applied: true, updated: 0 };
  }

  // Build bulk operations
  const ops = {};
  order.services.forEach(item => {
    const svcId = item.service && item.service.toString();
    const qty = parseInt(item.quantity, 10) || 0;
    if (!svcId || qty <= 0) return;
    if (!ops[svcId]) ops[svcId] = 0;
    ops[svcId] += qty;
  });

  const bulk = Object.keys(ops).map(svcId => ({
    updateOne: {
      filter: { _id: svcId },
      update: { $inc: { soldCount: ops[svcId] } }
    }
  }));

  if (bulk.length === 0) return { success: true, applied: true, updated: 0 };

  // Execute bulkWrite
  const res = await Service.bulkWrite(bulk);
  const updatedCount = res.modifiedCount || 0;
  return { success: true, applied: true, updated: updatedCount };
}

module.exports = { incrementSoldCountForOrder };
