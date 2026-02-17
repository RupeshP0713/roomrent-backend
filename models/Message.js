const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    senderId: { type: String, required: true },
    senderRole: { type: String, enum: ['Malik', 'Bhadot', 'admin'], required: true },
    receiverId: { type: String, required: true }, // 'admin' or user ID
    receiverRole: { type: String, enum: ['Malik', 'Bhadot', 'admin'], required: true },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);
