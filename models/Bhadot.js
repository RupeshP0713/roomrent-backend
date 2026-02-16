const mongoose = require('mongoose');

const BhadotSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    area: { type: String, default: '' },
    cast: { type: String, default: '' },
    totalFamilyMembers: { type: Number, default: 0 },
    status: { type: String, enum: ['Waiting', 'Approved'], default: 'Waiting' },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bhadot', BhadotSchema);
