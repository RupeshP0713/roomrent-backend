const mongoose = require('mongoose');

const RentRequestSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    malikId: { type: String, required: true },
    bhadotId: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Accepted', 'Rejected', 'Expired'], default: 'Pending' },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RentRequest', RentRequestSchema);
