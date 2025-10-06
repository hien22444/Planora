const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    address: { type: String, required: true },
    
    // Lưu nhiều ảnh thay vì chỉ 1
    images: { 
        type: [String], // array of strings
        default: ['/images/default-service.jpg']
    },

    // Lưu video
    video: { type: String, default: '' },

    status: { 
        type: String, 
        enum: ['active', 'inactive'], 
        default: 'active' 
    },

    shop: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },

    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },

    // Số lượng đã bán
    soldCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Service', ServiceSchema);
